import * as fs from 'node:fs'
import { parse } from 'csv-parse/sync'
import * as xmlhttprequest from 'xmlhttprequest'
import { textToSpeech } from "./azure-cognitiveservices-speech.js";
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ref: https://foosoft.net/projects/anki-connect/
function invoke(action, version, params = {}) {
  const XMLHttpRequest = xmlhttprequest.XMLHttpRequest
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.addEventListener('error', () => reject('failed to issue request'))
    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText)
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw 'response has an unexpected number of fields'
        }
        if (!response.hasOwnProperty('error')) {
          throw 'response is missing required error field'
        }
        if (!response.hasOwnProperty('result')) {
          throw 'response is missing required result field'
        }
        if (response.error) {
          throw response.error
        }
        resolve(response.result)
      } catch (e) {
        reject(e)
      }
    })

    xhr.open('POST', 'http://127.0.0.1:8765')
    xhr.send(JSON.stringify({action, version, params}))
  })
}

const noteParams = async (records) => {
  const notes = records.map((record) => {
    const [word, sentence, title, link, wordAudio, sentenceAudio] = record
    return {
      "deckName": "Words and sentences from websites",
      "modelName": "Words and sentences from websites",
      "fields": {
        "単語": word,
        "例文": sentence,
        "ページタイトル": title,
        "リンク": link,
        "単語音声": wordAudio,
        "例文音声": sentenceAudio,
      },
    }
  })

  return { "notes": notes }
}

const addNotes = async (records) => {
  const action = "addNotes"
  const version = 6
  const params = await noteParams(records)
  return await invoke(action, version, params)
}

const canAddNotes = async (records) => {
  const action = "canAddNotes"
  const version = 6
  const params = await noteParams(records)
  return await invoke(action, version, params)
}

const storeMediaFile = async (filename, path) => {
  const action = "storeMediaFile"
  const version = 6
  const params = {
    "filename": filename,
    "path": path
  }
  return await invoke(action, version, params)
}

const main = async () => {
  const file = fs.readFileSync(process.env.ANKIFILEPATH)
  const records = parse(file, {
    delimiter: '\t',
    skip_empty_lines: true,
    trim: true,
  })
  const results = await canAddNotes(records)
  const filteredRecords = records.map((record, index) => {
    return results[index] ? record : null
  }).filter((record) => {
    return record !== null
  })

  const recordsWithMP3 = await Promise.all(filteredRecords.map(async (record) => {
    const [word, sentence, title, link] = record
    const wordAudioStream = await textToSpeech(process.env.AZUREKEY, 'eastus', word, `./medias/${word}.mp3`)
    const wordAudio = await storeMediaFile(`_${word}.mp3`, `${__dirname}/medias/${word}.mp3`)
    const sentenceAudioStream = await textToSpeech(process.env.AZUREKEY, 'eastus', sentence, `./medias/${word}Sentence.mp3`)
    const sentenceAudio = await storeMediaFile(`_${word}Sentence.mp3`, `${__dirname}/medias/${word}Sentence.mp3`)
    return [word, sentence, title, link, `[sound:${wordAudio}]`, `[sound:${sentenceAudio}]`]
  }))

  addNotes(recordsWithMP3)
}

main()

import * as fs from 'node:fs'
import { parse } from 'csv-parse/sync'
import * as xmlhttprequest from 'xmlhttprequest'
import { textToSpeech } from './azure-cognitiveservices-speech.js'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VERSION = 6

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
  const params = await noteParams(records)
  return invoke(action, VERSION, params)
}

const canAddNotes = async (records) => {
  const action = "canAddNotes"
  const params = await noteParams(records)
  return invoke(action, VERSION, params)
}

const storeMediaFile = async (filename, path) => {
  const action = "storeMediaFile"
  const params = {
    "filename": filename,
    "path": path
  }
  return invoke(action, VERSION, params)
}

const notesInfo = async (notes) => {
  const action = "notesInfo"
  const params = {
    "notes": notes
  }
  return invoke(action, VERSION, params)
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

  // parallel(If row count is less than about 10, parallel generating is acceptable.)
  const recordsWithMP3 = await Promise.all(filteredRecords.map(async (record) => {
    const [word, sentence, title, link] = record
    const voice = "en-US, AIGenerate1Neural"
    await textToSpeech(process.env.AZUREKEY, 'eastus', word, `./medias/${word}.mp3`, voice)
    const wordAudio = await storeMediaFile(`_${word}.mp3`, `${__dirname}/medias/${word}.mp3`)
    await textToSpeech(process.env.AZUREKEY, 'eastus', sentence, `./medias/${word}Sentence.mp3`, voice)
    const sentenceAudio = await storeMediaFile(`_${word}Sentence.mp3`, `${__dirname}/medias/${word}Sentence.mp3`)
    return [word, sentence, title, link, `[sound:${wordAudio}]`, `[sound:${sentenceAudio}]`]
  }))

  // nonparallel(If there are too many rows, nonparallel generating is preferable.)
  // const recordsWithMP3 = []
  // for ( let record of filteredRecords ) {
  //   const [word, sentence, title, link] = record
  //   const voice = "en-US, AIGenerate1Neural"
  //   await textToSpeech(process.env.AZUREKEY, 'eastus', word, `./medias/${word}.mp3`, voice)
  //   const wordAudio = await storeMediaFile(`_${word}.mp3`, `${__dirname}/medias/${word}.mp3`)
  //   await textToSpeech(process.env.AZUREKEY, 'eastus', sentence, `./medias/${word}Sentence.mp3`, voice)
  //   const sentenceAudio = await storeMediaFile(`_${word}Sentence.mp3`, `${__dirname}/medias/${word}Sentence.mp3`)
  //   recordsWithMP3.push([word, sentence, title, link, `[sound:${wordAudio}]`, `[sound:${sentenceAudio}]`])
  // }

  const addedNoteIds = await addNotes(recordsWithMP3)
  const addedNotes = await notesInfo(addedNoteIds)
  console.log('Added cards:')
  await addedNotes.forEach((note) => console.log(note.fields))
}

main()

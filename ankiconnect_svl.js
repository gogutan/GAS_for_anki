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
    const [word, pron, sentence, sentenceTranslation, wordTranslation, wordAudio, sentenceAudio] = record
    return {
      "deckName": "SIL 10",
      "modelName": "SVL",
      "fields": {
        "単語": word,
        "発音記号": pron,
        "単語音声": wordAudio,
        "例文": sentence.replace("\\", ""),
        "例文和訳": sentenceTranslation,
        "例文音声": sentenceAudio,
        "単語和訳": wordTranslation,
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
  const file = fs.readFileSync('/Users/ryota_teruya/SIL - SIL10.tsv')
  const records = parse(file, {
    delimiter: '\t',
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  })
  const results = await canAddNotes(records)
  const filteredRecords = records.map((record, index) => {
    return results[index] ? record : null
  }).filter((record) => {
    return record !== null
  })
  // const recordsWithMP3 = await Promise.all(filteredRecords.map(async (record) => {
  //   const [word, pron, sentence, sentenceTranslation, wordTranslation] = record
  //   const voice = "en-US, AIGenerate1Neural"
  //   await textToSpeech('2b91081e96624e39a2897626f48e551f', 'eastus', word, `./medias/${word}SIL.mp3`, voice)
  //   const wordAudio = await storeMediaFile(`_${word}SIL.mp3`, `${__dirname}/medias/${word}SIL.mp3`)
  //   await textToSpeech('2b91081e96624e39a2897626f48e551f', 'eastus', sentence, `./medias/${word}SentenceSIL.mp3`, voice)
  //   const sentenceAudio = await storeMediaFile(`_${word}SentenceSIL.mp3`, `${__dirname}/medias/${word}SentenceSIL.mp3`)
  //   return [word, pron, sentence, sentenceTranslation, wordTranslation, `[sound:${wordAudio}]`, `[sound:${sentenceAudio}]`]
  // }))

  const secSleep = sec => new Promise(resolve => setTimeout(resolve, sec * 1000))
  const recordsWithMP3 = []
  for ( let record of filteredRecords ) {
    const [word, sentence, sentenceTranslation, wordTranslation] = record
    const voice = "en-US, AIGenerate1Neural"
    await textToSpeech(process.env.AZUREKEY, 'eastus', word, `./medias/${word}SIL.mp3`, voice)
    const wordAudio = await storeMediaFile(`_${word}SIL.mp3`, `${__dirname}/medias/${word}SIL.mp3`)
    await textToSpeech(process.env.AZUREKEY, 'eastus', sentence, `./medias/${word}SentenceSIL.mp3`, voice)
    const sentenceAudio = await storeMediaFile(`_${word}SentenceSIL.mp3`, `${__dirname}/medias/${word}SentenceSIL.mp3`)
    await secSleep(0.1)
    recordsWithMP3.push([word, '', sentence, sentenceTranslation, wordTranslation, `[sound:${wordAudio}]`, `[sound:${sentenceAudio}]`])
  }

  const addedNoteIds = await addNotes(recordsWithMP3)
  const addedNotes = await notesInfo(addedNoteIds)
  console.log('Added cards:')
  await addedNotes.forEach((note) => console.log(note.fields))
}

main()

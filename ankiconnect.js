import * as fs from 'node:fs'
import { parse } from 'csv-parse/sync'
import * as xmlhttprequest from 'xmlhttprequest'

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

const formatParams = (records) => {
  const notes = records.map((record) => {
    const [word, sentence, title, link] = record
    return {
      "deckName": "Words and sentences from websites",
      "modelName": "Words and sentences from websites",
      "fields": {
        "単語": word,
        "例文": sentence,
        "ページタイトル": title,
        "リンク": link
      },
    }
  })

  return { "notes": notes }
}

const main = async () => {
  const file = fs.readFileSync(process.env.ANKIFILEPATH)
  const records = parse(file, {
    delimiter: '\t',
    skip_empty_lines: true,
    trim: true,
  })
  const action = "addNotes"
  const version = 6
  const params = formatParams(records)
  await invoke(action, version, params)
}

main()

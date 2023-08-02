import * as fs from 'node:fs'
import * as xmlhttprequest from 'xmlhttprequest'
import { speechToText } from './whisper.js'
import path from 'path'
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
    const [transcription, sound, video] = record
    return {
      "deckName": "Genshin Impact",
      "modelName": "Genshin Impact",
      "fields": {
        "Transcription": transcription,
        "Sound": sound,
        "Video": video,
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

function getFilesInDirectory(dir) {
  const files = fs.readdirSync(dir); // ディレクトリ内のファイル名を取得
  const filePaths = files.filter(file => file !== '.DS_Store')
                         .map(file => path.join(dir, file)); // ファイル名をディレクトリパスと結合
  const allFilePaths = [];

  // ディレクトリ内のファイルのフルパスを再帰的に取得
  filePaths.forEach(filePath => {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      allFilePaths.push(filePath);
    } else if (stat.isDirectory()) {
      const subDirFilePaths = getFilesInDirectory(filePath);
      allFilePaths.push(...subDirFilePaths);
    }
  });

  const memo = {}
  allFilePaths.forEach(file => {
    if (memo[path.basename(file, path.extname(file))]) {
      memo[path.basename(file, path.extname(file))] += 1
    } else {
      memo[path.basename(file, path.extname(file))] = 1
    }
  })

  // return videos which are not saved in Anki yet.
  const filteredAllFilePaths = allFilePaths.filter(file => memo[path.basename(file, path.extname(file))] === 1)

  return filteredAllFilePaths;
}


const main = async () => {
  const videoPaths = getFilesInDirectory(process.env.GENSHINFILEPATH)
  // parallel(If row count is less than about 10, parallel generating is acceptable.)
  const recordsWithMP3 = await Promise.all(videoPaths.map(async (videoFilePath) => {
    const audioFilePath = path.join(
      path.dirname(videoFilePath),
      path.basename(videoFilePath, path.extname(videoFilePath)) + '.mp3'
    )
    const transcription = await speechToText(videoFilePath, audioFilePath)
    const audio = await storeMediaFile(`_${transcription}.mp3`, audioFilePath)
    const video = await storeMediaFile(`_${transcription}.mp4`, videoFilePath)
    return [transcription, `[sound:${audio}]`, `[sound:${video}]`]
  }))

  // nonparallel(If there are too many rows, nonparallel generating is preferable.)
  // const recordsWithMP3 = []
  // for ( let filePath of allFilePaths ) {
  // Some necessary codes
  // }

  const addedNoteIds = await addNotes(recordsWithMP3)
  const addedNotes = await notesInfo(addedNoteIds)
  console.log('Added cards:')
  await addedNotes.forEach((note) => console.log(note.fields))
}

main()

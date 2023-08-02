import { speechToText } from './whisper.js'

const main = async () => {
  const transcription = await speechToText('videoFilePath', 'audioFilePath')
  console.log(transcription)
}

main()

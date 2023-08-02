import * as fs from 'node:fs'
import { Configuration, OpenAIApi } from 'openai'
import ffmpeg from 'fluent-ffmpeg'
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

function convertMp4ToMp3(videoFilePath, audioFilePath) {
  return new Promise((resolve) => {
    ffmpeg(videoFilePath)
      .format('mp3')
      .save(audioFilePath)
      .on('end', () => { resolve() })
  })
}


export const speechToText = async (videoFilePath, audioFilePath) => {
  // await convertMp4ToMp3(videoFilePath, audioFilePath);
  const resp = await openai.createTranscription(
    fs.createReadStream(audioFilePath), // audio input file
    "whisper-1", // Whisper model name.
    undefined, // Prompt
    'text', // Output format. Options are: json, text, srt, verbose_json, or vtt.
    0, // Temperature.
    'ja' // ISO language code. Eg, for english `en`
  );
  return resp.data;
};
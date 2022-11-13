import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { Buffer } from 'buffer';
import { PassThrough } from'stream';
import * as fs from 'fs';

/**
 * Node.js server code to convert text to speech
 * @returns stream
 * @param {*} key your resource key
 * @param {*} region your resource region
 * @param {*} text text to convert to audio/speech
 * @param {*} filename optional - best for long text - temp file for converted speech/audio
 */
export const textToSpeech = async (key, region, text, filename)=> {

    // convert callback function to promise
    return new Promise((resolve, reject) => {

        const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
        speechConfig.speechSynthesisOutputFormat = 5; // mp3

        let audioConfig = null;

        if (filename) {
            audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
        }

        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        synthesizer.speakTextAsync(
            text,
            result => {

                const { audioData } = result;

                synthesizer.close();

                if (filename) {

                    // return stream from file
                    const audioFile = fs.createReadStream(filename);
                    resolve(audioFile);

                } else {

                    // return stream from memory
                    const bufferStream = new PassThrough();
                    bufferStream.end(Buffer.from(audioData));
                    resolve(bufferStream);
                }
            },
            error => {
                synthesizer.close();
                reject(error);
            });
    });
};

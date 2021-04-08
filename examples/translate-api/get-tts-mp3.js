const TranslateApi = require('../../translate-api')
const process = require('process')
const fs = require('fs')

/*
Gets text-to-speech mp3 data from google translate and saves it to a file.

example:
node get-tts-mp3.js out.mp3 fr "le french has arrived"
*/

const translateApi = new TranslateApi()

const main = async() => {
    const mp3 = await translateApi.getTts(process.argv[4], process.argv[3])
    await fs.promises.writeFile(process.argv[2], mp3)
}

main()
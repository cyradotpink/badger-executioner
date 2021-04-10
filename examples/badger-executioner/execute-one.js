const BatchExecuter = require('badger-executioner')
const process = require('process')
const fs = require('fs')

/*
Gets text-to-speech mp3 data from google translate and saves it to a file.

example:
node execute-one.js out.mp3 fr "le french has arrived"
*/

const batchExecuter = new BatchExecuter('translate.google.com')

var functionId = 'jQ1olc'
var payload = [process.argv[4], process.argv[3], null, 'null']
batchExecuter.executeOne(functionId, payload).then(returnValue => {
    fs.writeFile(process.argv[2], Buffer.from(returnValue[0], 'base64'), () => {})
})
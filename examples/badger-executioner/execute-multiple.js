const BatchExecuter = require('badger-executioner')
const process = require('process')
const fs = require('fs')

/*
Gets text-to-speech mp3 data in multiple languages from google translate and saves the results to files

example:
node execute-one.js fr,de,it "FORTNITE FAILS & Epic Wins! #178​ (Fortnite Battle Royale Funny Moments)"
*/

const batchExecuter = new BatchExecuter('translate.google.com')

var functionId = 'jQ1olc'
var textToSpeak = process.argv[3]
var outLanguages = process.argv[2].split(',')
var functionCalls = outLanguages.map(val => [functionId, [textToSpeak, val, null, 'null']])

batchExecuter.execute(functionCalls).then(results => {
    results.forEach(result => {
        fs.writeFile(`out_${outLanguages[result.index]}.mp3`, Buffer.from(result.returnValue[0], 'base64'), () => {})
    })
})
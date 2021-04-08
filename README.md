## Badger Executioner: A small node module for interacting with Google batchexecute apps

### Notes
I made this for fun, but it seemed useful enough to have its own Github repository.\
\
Ryan Kovatch's Medium post
["Deciphering Google’s mysterious ‘batchexecute’ system"](https://kovatch.medium.com/deciphering-google-batchexecute-74991e4e446c)
saved me _a lot_ of time making this, and if you're here I assume you probably already know how batchexecute works, but if you don't, I really do
recommend reading it. Batchexecute is not, and is not intended to be, intuitive to use for humans.\
\
This readme documents the `badger-executioner` module itself. This repository also contains the module `translate-api`, which itself _uses_ Badger Executioner
to provide a straight-forward way to interact with Google Translate programmatically. `translate-api` is documented [here](/translate-api/README.md).

### Installation
```
npm install --save https://github.com/SimonAlexPaul/badger-executioner/blob/main/translate-api/release/v0.0.1?raw=true
```
### Usage
The badger-executioner module exports the class BatchExecuter.\
Its constructor takes one argument, the host domain of the Google app on which you want to execute.\
Note that, when an instance is initialised, it makes one request to the app to retrieve some information required to execute functions, so make sure to re-use your instances.

```js
const BatchExecuter = require('badger-executioner')
const batchExecuter = new BatchExecuter('translate.google.com')
```

The class has two instance functions, `execute` and `executeOne`.\
`executeOne` is the simplest way to use this module and takes two arguments,
the function ID and the non-serialised JSON payload. It returns a promise which resolves to the return value of the execution.\
In this example, we use Google Translate's text-to-speech feature to read the string `"le french has arrived"` in a computer's approximation
of a french accent, and save the resulting mp3 as a file using `fs`:
```js
var functionId = 'jQ1olc'
var payload = ['le french has arrived', 'fr', null, 'null']
batchExecuter.executeOne(functionId, payload).then(returnValue => {
    fs.writeFile('french.mp3', Buffer.from(returnValue[0], 'base64'))
})
```

To leverage batchexecute's ability to execute multiple things in a single request, you may use the `execute` function.\
It takes one argument, an array of arrays, where those arrays are pairs of function IDs and payloads. The returned promise resolves to an array of objects
with the keys `index`, `functionId`, `payload` and `returnValue`, where `index` just reflects the index of the function call in the originally passed-in array
that the result belongs to, `functionId` and `payload` are just the function ID and payload that resulted in the result, and `returnValue` is the actual returned value from the API.\
The following example is similar to the last, but it text-to-speaks the string `"FORTNITE FAILS & Epic Wins! #178​ (Fortnite Battle Royale Funny Moments)"` in both a German and an Italian accent. (And saves both resulting mp3s)
```js
var functionId = 'jQ1olc'
var textToSpeak = 'FORTNITE FAILS & Epic Wins! #178​ (Fortnite Battle Royale Funny Moments)'
var functionCalls = [
    [functionId, [textToSpeak, 'de', null, 'null']],
    [functionId, [textToSpeak, 'it', null, 'null']]
]
batchExecuter.execute(functionCalls).then(results => {
    results.forEach(result => {
        fs.writeFile(`fortnite${result.index}.mp3`, Buffer.from(result.returnValue[0], 'base64'))
    })
})
```
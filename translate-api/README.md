## A small node module for easily interacting with Google Translate

This module provides a very simple way to use Google Translate's translation and text-to-speech features programmatically.\
This may or may not actually be useful to anyone.

### Installation
```
npm install --save https://github.com/SimonAlexPaul/badger-executioner/blob/main/translate-api/release/latest.tar.gz?raw=true
```
### Usage
The translate-api module exports the class TranslateApi.\
Note that, when an instance is initialised, it makes one request to Google Translate to retrieve some information required to execute functions, so make sure to re-use your instances.
```js
const TranslateApi = require('translate-api')
const translateApi = new TranslateApi()
```
The following snippet asynchronously translates the string `"hello"` from English to French, and logs the result:
```js
translateApi.getTranslation('hello', 'en', 'fr').then(res => console.log(res.translation))
```
You can do multiple things in a single request by using TranslateApi's `multiExec` function.\
By default, all instance methods that directly represent a functionality of Google Translate -
currently, that's `getTts` and `getTranslation` - return a promise
resolving to some result, as showcased in the above snippet.\
This default behaviour is controlled by the instance field `defaultNoExec`, which is normally `false` and may be set to `true`,
but can also be overruled using each method's optional last argument. For demonstration purposes, we will be doing both in the next snippet.\
Importantly, when `noExec` is `true` - either because the default was changed or because it was overruled - the return value may be passed to `multiExec` to be executed in a batch together with other executions. Specifically, `multiExec` expects an array of such values.\
The following snippet translates the string `"hello"` from English to French and Italian.
```js
translateApi.defaultNoExec = true
translateApi.multiExec([
    translateApi.getTranslation('hello', 'en', 'fr', true),
    translateApi.getTranslation('hello', 'en', 'it', true)
]).then(results => {
    console.log(results.map(result => result.result.translation))
})
```

Full examples can be found [here](/examples/translate-api).

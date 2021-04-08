const TranslateApi = require('../../translate-api')
const process = require('process')

/*
Translates a string into multiple languages in a single request

example:
node translate-to-multiple-languages.js en de,fr,it hell
*/

const translateApi = new TranslateApi()

const main = async() => {
    var inLanguage = process.argv[2]
    var outLanguages = process.argv[3].split(',')
    var input = process.argv[4]

    translateApi.defaultNoExec = true
    const results = await translateApi.multiExec(
        outLanguages.map(outLang => translateApi.getTranslation(input, inLanguage, outLang))
    )
    console.log(results)
}
main()
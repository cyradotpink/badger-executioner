const BatchExecuter = require('badger-executioner')

const TranslateApi = class {
    constructor() {
        this.batchExecuter = new BatchExecuter('translate.google.com')
    }

    defaultNoExec = false

    /** @private */
    functionMap = [
        ['jQ1olc', 'getTts'],
        ['MkEWBc', 'getTranslation']
    ]

    /** @private */
    returnValueProcessors = {
        getTts: (returnValue) => {
            return Buffer.from(returnValue[0], 'base64')
        },
        getTranslation: (returnValue) => {
            var translations = returnValue[1][0][0][5][0]
            return {
                translation: translations[0],
                alternatives: translations[1] || null
            }
        }
    }

    /** @private */
    processReturnValue(functionName, returnValue) {
        if (!returnValue) {
            return null
        } else {
            return this.returnValueProcessors[functionName](returnValue)
        }
    }

    /** @private */
    functionReturn(functionName, payload, noExec = this.defaultNoExec) {
        var functionId = this.functionMap.find(val => val[1] === functionName)[0]
        if (noExec) {
            return [functionId, payload]
        } else {
            return new Promise(async(resolve) => {
                resolve(this.processReturnValue(
                    functionName,
                    await this.batchExecuter.executeOne(functionId, payload)
                ))
            })
        }
    }

    async multiExec(functionCalls) {
        var results = await this.batchExecuter.execute(functionCalls)
        var processedResults = results.map((result) => {
            var functionName = this.functionMap.find(val => val[0] === result.functionId)[1]
            if (functionName) {
                return {
                    index: result.index,
                    functionName: functionName,
                    result: this.processReturnValue(functionName, result.returnValue)
                }
            } else {
                delete result.payload
                return result
            }
        })
        return processedResults
    }

    getTts(input, language, noExec = this.defaultNoExec) {
        var payload = [input, language, null, 'null']
        return this.functionReturn('getTts', payload, noExec)
    }

    getTranslation(input, inLanguage, outLanguage, noExec = this.defaultNoExec) {
        var payload = [
            [input, inLanguage, outLanguage, true],
            [null]
        ]
        return this.functionReturn('getTranslation', payload, noExec)
    }
}

module.exports = TranslateApi
const BatchExecuter = require('badger-executioner')

const TranslateApi = class {
    constructor() {
        this.batchExecuter = new BatchExecuter('translate.google.com')
    }

    /**
     * The BatchExecuter instance used
     */
    batchExecuter

    /**
     * Controls whether translate-functionality-representing instance functions return promises
     * resolving to results, or request information that may be passed to multiExec. Is false by default.
     */
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

    /**
     * Do multiple things in one request
     * @param {Array} functionCalls
     * @returns Array of objects with properties index, functionName and result
     */
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

    /**
     * Get Google text-to-speech MP3 data
     * @param {string} input The string to speak
     * @param {string} language The tts language code
     * @param {boolean} noExec defaultNoExec override
     * @returns MP3 data buffer
     */
    getTts(input, language, noExec = this.defaultNoExec) {
        var payload = [input, language, null, 'null']
        return this.functionReturn('getTts', payload, noExec)
    }

    /**
     * Translate a string from one language to another
     * @param {string} input The input to translate 
     * @param {string} inLanguage The input language
     * @param {string} outLanguage The desired ouput language
     * @param {boolean} noExec defaultNoExec override
     * @returns Object with properties translation and alternatives
     */
    getTranslation(input, inLanguage, outLanguage, noExec = this.defaultNoExec) {
        var payload = [
            [input, inLanguage, outLanguage, true],
            [null]
        ]
        return this.functionReturn('getTranslation', payload, noExec)
    }
}

module.exports = TranslateApi
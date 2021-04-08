const https = require('https')
const http = require('http')
const querystring = require('querystring')

// Ryan Kovatch's Medium post "Deciphering Google’s mysterious ‘batchexecute’ system" saved me a lot of time here.
// Worth a read: https://kovatch.medium.com/deciphering-google-batchexecute-74991e4e446c

const parseCookie = (cookie) => {
    const argsSplit = cookie.split('; ');
    const paramsDict = {};
    argsSplit.slice(1).forEach((keyVal) => {
        var keyValSplit = keyVal.split('=');
        paramsDict[keyValSplit[0]] = keyValSplit[1] ? keyValSplit[1] : '';
    });
    return {
        key: argsSplit[0].split('=')[0],
        value: argsSplit[0].split('=')[1],
        params: paramsDict
    }
}

const httpReq = (options, data = '', secure = true) => {
    return new Promise((resolve, reject) => {
        if (data && typeof options === 'object') {
            if (!options.headers) options.headers = {}
            options.headers['content-length'] = Buffer.byteLength(data).toString()
        }
        const httpVariant = secure ? https : http
        var req = httpVariant.request(options, (res) => {
            var data = ''
            res.on('error', (err) => {
                reject(err)
            })
            res.on('data', (d) => {
                data += d
            })
            res.on('end', () => {
                var cookieSets = res.headers['set-cookie']
                var parsedCookies = []
                if (Array.isArray(cookieSets)) {
                    parsedCookies = cookieSets.map(cookieSet => parseCookie(cookieSet))
                } else if (cookieSets) {
                    parsedCookies = [parseCookie(cookieSets)]
                }
                resolve({
                    'data': data,
                    'status': res.statusCode,
                    'headers': res.headers,
                    'cookies': parsedCookies
                })
            })
        })
        req.write(data)
        req.on('error', (err) => {
            reject(err)
        })
        req.on('timeout', () => {
            reject(new Error('Timeout'))
        })
        req.end()
    })
}

// Gets the needed values for batchexecutes on the specified app
const getBatchExecValues = async(url) => {
    var response = await httpReq(url)
    if (response.status !== 200) throw new Error(`Non-OK HTTP status code ${response.status}`)

    // Isolates the script that sets the needed information
    var script = response.data.match(/<script data-id="_gd"[\s\S]*?>([\s\S]*?)<\/script>/)[1]

    // Evaluates the object literal contained in the script
    // var obj = new Function('return ' + script.match(/=([\s\S]*);/)[1])()

    // Parses the object literal as JSON. Safer than evaluating, but more likely to break.
    var obj = JSON.parse(script.match(/=([\s\S]*);/)[1])
    return {
        uiName: obj.qwAQke, // Name of the application
        backend: obj.cfb2h, // Identifier of the backend bit used to process executions
        csrfToken: obj.FdrFJe, // Some anti-csrf thing
        userCsrf: obj.SNlM0e // Is currently always undefined (Because it's only set when a user's cookie is present in the request)
    }
}

/**
 * Allows you to use Google's batch execution system on any Google application
 * @class
 */
const BatchExecuter = class {
    constructor(hostname) {
        /**
         * @private
         */
        this._priv = {}

        var onInitCallback = () => {}

        // While the object is not initialised, waitForInit is a promise that resolves when the object becomes initalised.
        this._priv.waitForInit = new Promise(resolve => onInitCallback = resolve)

        // Asynchronous initialisation
        setImmediate(async() => {
            this._priv.hostname = hostname

            // Set initial request ID to be a four digit integer, and create a getter that adds 100k to it when its used.
            // Doesn't really seem to matter, but this is how Google apps do it.
            this._priv.requestId = Math.floor(Math.random() * 9000) + 1000 // 1000 - 9999
            this._priv.getRequestId = () => {
                var id = this._priv.requestId
                this._priv.requestId = id + 100000
                return id
            }
            this._priv.batchExecInfo = await getBatchExecValues(`https://${hostname}/`)

            // When the object is initalised, waitForInit is an immediate value, because the concerned await does not need to wait.
            this._priv.waitForInit = true

            // Resolve the promise that may be awaited
            onInitCallback()
        })
    }

    /**
     * Executes a "batch" of function calls
     * @param {Array} functionCalls Array of calls like [[function, payload], [function, payload], ...]
     * @returns Results of the execution
     */
    async execute(functionCalls) {
        // Await initialisation
        await this._priv.waitForInit

        var path = `/_/${this._priv.batchExecInfo.uiName}/data/batchexecute`

        // Derive an array of unique function ids from provided functionCalls
        var functionNames = [...(new Set(functionCalls.map(call => call[0])))]
        var queryString = querystring.stringify({
            rpcids: functionNames.toString(), // The different function ids present in the request, comma-separated
            'f.sid': this._priv.batchExecInfo.csrfToken, // Anti-csrf thing
            bl: this._priv.batchExecInfo.backend, // Responsible backend
            _reqid: this._priv.getRequestId(), // Request id
            hl: 'en', // Response language
            rt: 'c' // Weird constant thing idk
        })
        var requestOptions = {
            method: 'POST',
            path: `${path}?${queryString}`,
            hostname: this._priv.hostname,
            headers: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            }
        }

        // The request body is application/x-www-form-urlencoded. We make it from an object using the querystring module
        var formData = {}

        // If there's only one function call, its execution order value is "generic". Otherwise, it's integers starting at 1.
        if (functionCalls.length == 1) {
            formData['f.req'] = JSON.stringify([
                [ /*Function ID           JSON payload                         null  execution order */
                    [functionCalls[0][0], JSON.stringify(functionCalls[0][1]), null, 'generic']
                ]
            ])
        } else {
            let i = 1
            formData['f.req'] = JSON.stringify([
                /*                                            Function ID JSON payload           null  execution order */
                functionCalls.map(([functionId, payload]) => [functionId, JSON.stringify(payload), null, (i++).toString(10)])
            ])
        }
        // If user-connected anti-csrf thing is present, include in form data. Doesn't currently happen.
        if (this._priv.batchExecInfo.userCsrf) formData.at = this._priv.batchExecInfo.userCsrf

        var response = await httpReq(requestOptions, querystring.stringify(formData))

        if (response.status !== 200) throw new Error(`Non-OK HTTP status code ${response.status}`)

        // Response envelopes start after 3 newlines
        var responseText = response.data.slice(response.data.match(/(.*\n){3}/)[0].length)

        // Splitting on integer lines gives us an array of envelopes. Filtering to remove metadata envelopes.
        var envelopes = responseText.split(/\n\d+?\n/).map(env => JSON.parse(env)).filter(val => val[0][0] === 'wrb.fr')

        var index = 0

        // Returning an array of objects with function id, payload, index in original functionCalls array, and return value
        var returnArr = functionCalls.map(([id, payload]) => ({
            functionId: id,
            payload: payload,
            index: index++,
            returnValue: null
        }))
        envelopes.forEach((env) => {
            env = env[0]
            var index

            // Execution is order is reflected at envelope index 6. We use it to figure out which call each envelope belongs to.
            if (env[6] === 'generic') {
                index = 0
            } else {
                index = parseInt(env[6]) - 1
            }
            returnArr.find(item => item.index === index).returnValue = JSON.parse(env[2])
        })
        return returnArr
    }

    /**
     * Simpler way to execute only a single function call
     * @param {string} functionId The function ID
     * @param {object} payload The payload object
     * @returns The return value for the call
     */
    async executeOne(functionId, payload) {
        return (await this.execute([
            [functionId, payload]
        ]))[0].returnValue
    }
}

module.exports = BatchExecuter
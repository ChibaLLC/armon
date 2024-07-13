class Emitter {
    /**
     * @typedef {Object} Events
     * @property {Array<Function>} error
     * @property {Array<Function>} data
     * @property {Array<Function>} end
     */

    /**
     * @type {Events}
     */
    events = {
        error: [],
        data: [],
        end: []
    }

    /**
     * @type {Events}
     */
    backpressure = {
        error: [],
        data: [],
        end: []
    }

    constructor() {
        this.events = {
            error: [],
            data: [],
            end: []
        }
    }

    /**
     * @param {keyof Events} event
     * @param {Function} listener
     */
    on(event, listener) {
        if (this.backpressure[event]?.length) {
            this.backpressure[event].forEach((args) => listener(...args))
        }
        if (!this.events[event]) {
            this.events[event] = []
        }
        this.events[event].push(listener)
    }

    /**
     * @param {keyof Events} event
     * @param  {...any} args
     */
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach((listener) => listener(...args))
        } else {
            if (!this.backpressure[event]) {
                this.backpressure[event] = []
            }
            this.backpressure[event].push(args)
        }
    }
}

/**
 * @template T
 * @typedef {Object} APIResponse
 * @property {number} statusCode
 * @property {?T} body
 */

/**
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {APIResponse<T>} results
 * @property {string} next
 * @property {string} previous
 * @property {number} count
 */

export default class Utils {
    /**
     * @param {Response} response
     * @returns {boolean}
     */
    static isHtmlResponse(response) {
        return response.headers.get('content-type')?.includes('text/html') || false
    }

    /**
     * Replaces all possible json syntax characters with an equivalent space or newline
     * @param str
     * @returns {string}
     */
    static normaliseJsonString(str) {
        return str.replace(/[{}\[\](),:]/g, ' ').replace(/"/g, "'").replace(/\\n/g, '\n')
    }

    static isStreamResponse(response) {
        const contentType = response.headers.get('content-type') || response.headers.get('Content-Type')

        if (contentType?.includes('text/event-stream')) {
            return 'text'
        } else if (contentType?.includes('application/octet-stream')) {
            return 'binary'
        }

        return false
    }

    /**
     * @param {Response} response
     * @returns {boolean}
     */
    static isJsonResponse(response) {
        return response.headers.get('content-type')?.includes('application/json') || false
    }

    /**
     * @param {Object & {errors?: string} | Response | Error | string} response
     * @returns {void}
     */
    static unWrapUnFetchError(response) {
        if (response instanceof Error) {
            return Utils.showError(response.message || Utils.normaliseJsonString(JSON.stringify(response)))
        }

        if (response instanceof Response) {
            response.text().then((text) => {
                Utils.showError(text)
            })
            return
        }

        if (typeof response === 'string') {
            if (Utils.hasHtml(response)) {
                Utils.showHtml(response)
            } else {
                Utils.showError(response)
            }
            return
        }

        if (response instanceof Object) {
            const obj = response?.errors || response?.message || response.body || response
            try {
                Utils.showError(Utils.normaliseJsonString(JSON.stringify(obj)))
            } catch (error) {
                console.error("Unable to stringify error\n", error)
            }
            return
        }

        console.error(response)
    }

    /** Clean and normalize a URL
     * @param {string | URL} url
     * @returns {URL}
     */
    static cleanUrl(url) {
        if (!(url instanceof URL)) {
            url = url.trim()
            if (!url.startsWith('http')) {
                url = `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
            }
            url = new URL(url)
        }

        if (!url.pathname.endsWith('/')) {
            url.pathname = `${url.pathname}/`
        }

        if (!url.searchParams.has('format')) {
            url.searchParams.append('format', 'json')
        }

        return url
    }

    static showHtml(content) {
        const modal = document.createElement('div')
        modal.innerHTML = content
        modal.style.position = 'fixed'
        modal.style.top = '0'
        modal.style.left = '0'
        modal.style.width = '90%'
        modal.style.height = '90%'
        modal.style.backgroundColor = 'white'
        modal.style.zIndex = '1000'
        modal.style.overflow = 'auto'
        modal.style.padding = '20px'
        modal.style.transform = 'translate(5%, 5%)'
        modal.style.border = '1px solid #ccc'
        modal.style.borderRadius = '5px'
        modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)'

        const close = document.createElement('button')
        close.textContent = 'Close'
        close.style.position = 'absolute'
        close.style.top = '10px'
        close.style.right = '10px'
        close.style.padding = '5px 10px'
        close.style.border = '1px solid #ccc'
        close.style.borderRadius = '5px'
        close.style.backgroundColor = 'red'
        close.style.cursor = 'pointer'
        close.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.1)'
        close.style.transition = 'background-color 0.3s'
        close.style.color = 'white'
        close.style.zIndex = '1001'

        const veil = document.createElement('div')
        veil.style.position = 'fixed'
        veil.style.top = '0'
        veil.style.left = '0'
        veil.style.width = '100%'
        veil.style.height = '100%'
        veil.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
        veil.style.zIndex = '999'

        modal.appendChild(close)
        document.body.appendChild(veil)
        document.body.appendChild(modal)
        close.addEventListener('click', () => {
            modal.remove()
            veil.remove()
        })
    }

    static hasHtml(content) {
        return content.includes('<html') && content.includes('<body')
    }


    /**
     * @typedef ErrorResponse
     * @property {Response} response
     * @property {Error} error
     *
     * @typedef ErrorRequest
     * @property {Request} request
     * @property {Error} error
     */

    /**
     * @typedef {Object} FetchOptions
     * @property {?((value: ErrorRequest) => void)} onRequestError
     * @property {?((value: ErrorResponse) => void)} onResponseError
     * @property {?boolean} [unWrapErrors = true]
     * @property {?boolean} [stream = false]
     */

    /**
     * Fetch utility function,
     * @typedef {Object} FetchResponse
     * @property {"HTML" | "JSON" | "UNKNOWN" | "ERROR" | "STREAM"} format
     * @property {?Response} response
     *
     * @template T
     * @property {T | Error | Object } value
     * @param {string | URL} url
     * @param {RequestInit & FetchOptions} [options = {}]
     * @returns {Promise<FetchResponse<T> | Emitter>}
     */
    static async unFetch(url, options = {
        unWrapErrors: true,
        stream: false,
        onRequestError: null,
        onResponseError: null,
        headers: {}
    }) {
        url = Utils.cleanUrl(url)

        if (!options?.headers || !options.headers['Content-Type']) {
            options.headers = {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        }


        const response = await fetch(url, options).then(async res => {
            /** @type {'binary' | 'text' | boolean} */
            const is_stream = Utils.isStreamResponse(res)
            if (is_stream) {
                return { format: "STREAM", value: is_stream, response: res }
            }

            if (Utils.isHtmlResponse(res)) {
                return { format: "HTML", value: await res.text(), response: res }
            }

            if (Utils.isJsonResponse(res)) {
                const data = await res.json().catch(err => {
                    return { format: "ERROR", value: err, response: res }
                })

                if (data?.errors || !res.ok) {
                    return { format: "ERROR", value: data?.errors || data, response: res }
                }

                if (data?.statusCode >= 400 || data?.status >= 500) {
                    return { format: "ERROR", value: data, response: res }
                }

                return { format: "JSON", value: data, response: res }
            }

            return { format: "UNKNOWN", value: res, response: res }
        }).catch(err => {
            if (options?.onRequestError) {
                options.onRequestError({ request: err.response, error: err })
            }

            return { format: "ERROR", value: err, response: null }
        })

        if (response.format === "ERROR") {
            if (options?.unWrapErrors) {
                Utils.unWrapUnFetchError(response.value)
            }

            if (options?.onResponseError) {
                options.onResponseError({ response: response.value, error: response.value })
            }

            if (options?.unWrapErrors || options?.onResponseError) {
                return { format: "ERROR", value: null }
            }
        }

        if (response.format === "HTML" && options?.unWrapErrors) {
            Utils.unWrapUnFetchError(response.value)
        }

        if (!options?.stream) {
            if (response.format === "STREAM") {
                console.warn('Stream response received, use stream option to read data')
            }
            return response
        }

        const emitter = new Emitter()
        const reader = response.response?.body?.getReader()

        const Parser = () => {
            if (response.value === 'binary') {
                return {
                    decode: (value) => {
                        return new Blob(value)
                    }
                }
            }

            if (response.value === 'text') {
                return new TextDecoder()
            }

            return null
        }

        const parser = Parser()

        async function readStream() {
            /** @type {any} */
            const { done, value: _value } = await reader?.read() || { done: true, value: null }
            if (done) {
                emitter.emit('end')
                return
            }

            let value = parser ? parser.decode(_value) : _value

            emitter.emit('data', value)
            await readStream()
        }

        // Do not await readStream
        readStream().then()
        return emitter
    }

    /**
     * @template T
     * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} input
     * @param {T} target
     * @param {keyof T} attribute
     */
    static bindInput(input, target, attribute) {
        input.value = target[attribute]
        input.addEventListener('change', (e) => {
            target[attribute] = e.target.value
        })
    }

    static get URL() {
        return new URL(window.location.href)
    }

    static showMessage(message) {
       alert(message)
    }

    static showSuccess(message) {
        alert(message)
    }

    /**
     * @param {string | Record<string, any>} message
     */
    static showError(message) {
        if (typeof message === 'object') {
            message = Utils.normaliseJsonString(JSON.stringify(message))
        }
        alert(message)
    }

    /**
     * Prompt the user to confirm an action
     * @param {string} message
     * @param {Function} callback
     * @returns {Promise<boolean>}
     */
    static confirmAction(message, callback) {
        return confirm(message) && callback()
    }

    /**
     * @param {string} content
     * @returns {string}
     */
    static stripHtml(content) {
        content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        content = content.replace(/(\r\n|\n|\r)/gm, '')

        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html')
        return doc.body.textContent || ""
    }

    /**
     * @returns {string | undefined}
     */
    static getLastUrlSegmentValue() {
        return Utils.URL.pathname.split('/').filter(Boolean).pop()
    }
}

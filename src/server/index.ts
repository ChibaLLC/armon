import { createApp, Router } from "h3";
import { watchFiles } from "./router";
import consola from "consola";
import { join } from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";
import { joinURL } from "ufo";

const app = createApp()

async function startServer(config: { clientFolder: string; router: Router; functions: Map<string, string[]>; serverEndpoint: string }) {
    app.use(config.router)
    const utilsPath = join(config.clientFolder, 'utils.js')
    const exists = await access(utilsPath).then(() => true).catch(() => false)
    if (!exists) {
        await mkdir(join(config.clientFolder), { recursive: true })

        const utils = await import('../client/utils').then(m => m.default)
        if (utils) {
            await writeFile(utilsPath, `export default ${utils.toString()}`).catch(e => {
                console.error(e)
                throw new Error("Could not write file to the client folder")
            })
            consola.info(`Created file ${utilsPath}`)
        } else {
            consola.warn("Could not find utils file in the client folder")
        }
    }

    for (let location of config.functions.keys()) {
        const _locations = location.split('/')
        const className = _locations[1]
        const isStore = _locations.at(-1) === 'store'
        if (!className) throw new Error("Invalid route found " + location)
        let _functions = config.functions.get(location)
        const classFile = `
        import Utils from './utils.js'
        export default class ${className}Store {
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
             * @returns {Promise<\FetchResponse\<T> | Emitter>}
             */
            ${isStore ? _functions.map(func => {
            return `
                    /**
                     * @param {Object} data
                     * @param {FetchOptions} options
                     * @returns {Promise\<FetchResponse>}
                     * @static
                     * @memberof ${className}Store
                     */
                    static async ${func}({data, options} = {}) {
                        if(!options) options = {}
                        if(!options?.method) options.method = "GET"
                        if(!options?.method && data) options.method = "POST"

                        if(options?.method === "GET" && data) throw new Error("GET method does not accept data")

                        if (data) {
                            const payload = JSON.stringify(data)

                            return await Utils.unFetch(\`${joinURL(config.serverEndpoint, location, func)}\`, {
                                method: options.method,
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: payload
                            })
                        } else {
                            return await Utils.unFetch(\`${joinURL(config.serverEndpoint, location, func)}\`, {
                                method: options.method
                            })
                        }
                    }`
        }).join('\n') :
                `
                /**
                 * @param {Object} data
                 * @param {FetchOptions} options
                 * @returns {Promise\<FetchResponse>}
                 * @static
                 * @memberof ${className}Store
                 */
                static async get({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "GET"

                    return await Utils.unFetch(\`${joinURL(config.serverEndpoint, location)}\`, {
                        method: options.method
                    })
                }

                /**
                 * @param {Object} data
                 * @param {FetchOptions} options
                 * @returns {Promise\<FetchResponse>}
                 * @static
                 * @memberof ${className}Store
                 * @throws {Error} POST method requires data
                 */
                static async post({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "POST"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await Utils.unFetch(\`${joinURL(config.serverEndpoint, location)}\`, {
                            method: options.method,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: payload
                        })
                    } else {
                        throw new Error("POST method requires data")
                    }
                }

                /**
                 * @param {Object} data
                 * @param {FetchOptions} options
                 * @returns {Promise\<FetchResponse>}
                 * @static
                 * @memberof ${className}Store
                 * @throws {Error} PUT method requires data
                 */
                static async put({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "PUT"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await Utils.unFetch(\`${joinURL(config.serverEndpoint, location)}\`, {
                            method: options.method,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: payload
                        })
                    } else {
                        throw new Error("PUT method requires data")
                    }   
                }

                /**
                 * @param {Object} data
                 * @param {FetchOptions} options
                 * @returns {Promise\<FetchResponse>}
                 * @static
                 * @memberof ${className}Store
                 * @throws {Error} DELETE method requires data
                 */
                static async delete({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "DELETE"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await Utils.unFetch(\`${joinURL(config.serverEndpoint, location)}\`, {
                            method: options.method,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: payload
                        })
                    } else {
                        throw new Error("DELETE method requires data")
                    }
                }
                `
            }
        }`

        const filePath = join(config.clientFolder!, `${className}.js`)
        await access(config.clientFolder!).catch(async () => {
            await mkdir(config.clientFolder!, { recursive: true })
        })

        await writeFile(filePath, classFile).catch(e => {
            console.error(e)
            throw new Error("Could not write file to the client folder")
        })

        consola.info(`Created file ${filePath}`)
    }

    consola.success("Server started")
}

watchFiles(startServer)
export { app }

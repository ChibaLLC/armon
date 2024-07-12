import { createApp, Router } from "h3";
import { watchFiles } from "./router";
import consola from "consola";
import { join } from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";
import { joinURL } from "ufo";

const app = createApp()

async function startServer(config: { clientFolder: string; router: Router; functions: Map<string, string[]>; serverEndpoint: string }) {
    const methods = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace', 'connect'])
    app.use(config.router)

    for (let location of config.functions.keys()) {
        const _locations = location.split('/')
        const className = _locations[1]
        const isStore = _locations.at(-1) === 'store'
        if (!className) throw new Error("Invalid route found " + location)
        let _functions = config.functions.get(location)
        const classFile = `
        export default class ${className}Store {
            ${isStore ? _functions.map(func => {
            return `
                    static async ${func}({data, options} = {}) {
                        if(!options) options = {}
                        if(!options?.method) options.method = "GET"
                        if(!options?.method && data) options.method = "POST"

                        if(options?.method === "GET" && data) throw new Error("GET method does not accept data")

                        if (data) {
                            const payload = JSON.stringify(data)

                            return await fetch(\`${joinURL(config.serverEndpoint, location, func)}\`, {
                                method: options.method,
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: payload
                            })
                        } else {
                            return await fetch(\`${joinURL(config.serverEndpoint, location, func)}\`, {
                                method: options.method
                            })
                        }
                    }`
        }).join('\n') :
                `
                static async get({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "GET"

                    return await fetch(\`${joinURL(config.serverEndpoint, location)}\`, {
                        method: options.method
                    })
                }

                static async post({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "POST"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await fetch(\`${joinURL(config.serverEndpoint, location)}\`, {
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

                static async put({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "PUT"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await fetch(\`${joinURL(config.serverEndpoint, location)}\`, {
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

                static async delete({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "DELETE"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await fetch(\`${joinURL(config.serverEndpoint, location)}\`, {
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

import { createApp, Router } from "h3";
import { watchFiles } from "./router";
import consola from "consola";
import { join } from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";

const app = createApp()

async function startServer(clientFolder: string, router: Router, functions: Map<string, string[]>) {
    app.use(router)

    for (let location of functions.keys()) {
        const className = location.split('/')[1]
        if (!className) throw new Error("Invalid route found " + location)

        const _functions = functions.get(location)
        const classFile = `
        export default class ${className}Store {
            ${_functions?.length ? _functions.map(func => {
            return `
                    static async ${func}({data, options} = {}) {
                        if(!options) options = {}
                        if(!options?.method) options.method = "GET"
                        if(!options?.method && data) options.method = "POST"

                        if(options?.method === "GET" && data) throw new Error("GET method does not accept data")

                        if (data) {
                            const payload = JSON.stringify(data)

                            return await fetch(\`${location}/${func}\`, {
                                method: options.method,
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: payload
                            })
                        } else {
                            return await fetch(\`${location}/${func}\`, {
                                method: options.method
                            })
                        }
                    }`
        }).join('\n') :
                `
                static async get({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "GET"

                    return await fetch(\`${location}\`, {
                        method: options.method
                    })
                }

                static async post({data, options} = {}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "POST"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await fetch(\`${location}\`, {
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

                        return await fetch(\`${location}\`, {
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

                        return await fetch(\`${location}\`, {
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

        const filePath = join(clientFolder!, `${className}.js`)
        await access(clientFolder!).catch(async () => {
            await mkdir(clientFolder!, { recursive: true })
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

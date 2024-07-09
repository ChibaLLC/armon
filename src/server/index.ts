import { createApp } from "h3";
import { makeRoutes } from "./router";
import consola from "consola";
import { join } from "node:path";
import { getClientsFilesLocation } from "./utils";
import { access, mkdir, writeFile } from "node:fs/promises";

const app = createApp()

async function startServer() {
    const paths = await makeRoutes()
    const clientFolder = await getClientsFilesLocation()
    app.use(paths.router)

    const functions = paths.functions

    for (let route of functions.keys()) {
        const className = route.split('/')[1]
        if (!className) throw new Error("Invalid route found " + route)

        const _functions = functions.get(route)
        const classFile = `
        export default class ${className}Store {
            ${_functions?.length ? _functions.map(func => {
            return `
                    async ${func}({data, options}) {
                        if(!options) options = {}
                        if(!options?.method) options.method = "GET"
                        if(!options?.method && data) options.method = "POST"

                        if(options?.method === "GET" && data) throw new Error("GET method does not accept data")

                        if (data) {
                            const payload = JSON.stringify(data)

                            return await fetch(\`${route}/${func}\`, {
                                method: options.method,
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: payload
                            })
                        } else {
                            return await fetch(\`${route}/${func}\`, {
                                method: options.method
                            })
                        }
                    }`
        }).join('\n') :
                `
                async get({options}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "GET"

                    return await fetch(\`${route}\`, {
                        method: options.method
                    })
                }

                async post({data, options}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "POST"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await fetch(\`${route}\`, {
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

                async put({data, options}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "PUT"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await fetch(\`${route}\`, {
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

                async delete({data, options}) {
                    if(!options) options = {}
                    if(!options?.method) options.method = "DELETE"

                    if (data) {
                        const payload = JSON.stringify(data)

                        return await fetch(\`${route}\`, {
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

startServer()
export { app }

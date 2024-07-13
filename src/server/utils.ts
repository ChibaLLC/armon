import { readdir, lstat, readFile } from 'fs/promises';
import { H3Event } from 'h3';
import { join, normalize, sep } from 'node:path'
import { getPort } from "get-port-please";
import consola from 'consola';

async function isIgnored(base: string, location: string) {
    const ignored = [
        '.git',
        'node_modules',
        'dist'
    ]

    return ignored.includes(location) || (!(/[A-Z]/.test(location.charAt(0))) && location.toLowerCase() !== 'store.ts')
}

/**
 * Returns an array of string of valid relative path to store.ts files within capitalised Folders names in origin
 * @param {string} base the root directory
 * @param {Array<string>} path (unused during initiation) the paths to the store.ts files within the directory
 * @returns 
 */
export async function getStores(base: string, path?: string[]): Promise<string[]> {
    if (!path) path = [];
    if (!base?.trim()) return path;

    const stats = await lstat(base).catch(_ => null)
    if (stats && !stats.isDirectory()) {
        path.push(base)
        return path
    } else if (!stats) {
        throw new Error("Unable to read atrributes of " + base)
    }

    const items = await readdir(base);

    for (const item of items) {
        if (await isIgnored(base, item)) continue
        const location = join(base, item)
        await getStores(location, path)
    }

    return path
}

export async function getServerFilesLocation(): Promise<string | undefined> {
    const workDir = process.cwd()
    const file = await readFile(join(workDir, 'armon.json')).catch(e => {
        console.error(e)
        throw new Error("Armon File Not Found. Please add it with a key 'server' containing your server files directory in the root of your projet")
    })

    try {
        var content = JSON.parse(file.toString())
    } catch (e) {
        throw new Error("Could not parse armon file content")
    }

    return content?.server?.files
}

export async function getSpecifiedServer(): Promise<{
    host: string,
    port: number,
    secure?: boolean
}> {
    const workDir = process.cwd()
    const file = await readFile(join(workDir, 'armon.json')).catch(e => {
        console.error(e)
        throw new Error("Armon File Not Found. Please add it with a key 'server' containing your server files directory in the root of your projet")
    })

    try {
        var content = JSON.parse(file.toString())
    } catch (_) { }

    return content?.server || { host: 'localhost', port: await getPort({ portRange: [3000, 4000] }) }
}

export async function getServerEndpoint(): Promise<string> {
    const server = await getSpecifiedServer()
    if (server.secure) {
        return `https://${server.host}:${server.port}`
    }
    return `http://${server.host}:${server.port}`
}

export async function getClientEndpoint(): Promise<string> {
    const client = await getSpecifiedClient()
    if (client.secure) {
        return `https://${client.host}:${client.port}`
    }
    return `http://${client.host}:${client.port}`
}

export async function getSpecifiedClient(): Promise<{
    host: string;
    port: number;
    secure?: boolean;
}> {
    const workDir = process.cwd()
    const file = await readFile(join(workDir, 'armon.json')).catch(e => {
        console.error(e)
        throw new Error("Armon File Not Found. Please add it with a key 'client' containing your client files directory in the root of your projet")
    })

    try {
        var content = JSON.parse(file.toString())
    } catch (e) {
        throw new Error("Could not parse armon file content")
    }

    if (!content?.client) throw new Error("Client not found")
    if (!content.client?.port) {
        consola.info("Client port not found. Using default port 80")
    }
    return { host: content.client.host || 'localhost', port: content.client?.port || 80 }
}

export async function getClientsFilesLocation(): Promise<string | undefined> {
    const workDir = process.cwd()
    const file = await readFile(join(workDir, 'armon.json')).catch(e => {
        console.error(e)
        throw new Error("Armon File Not Found. Please add it with a key 'client' containing your client files directory in the root of your projet")
    })

    try {
        var content = JSON.parse(file.toString())
    } catch (e) {
        throw new Error("Could not parse armon file content")
    }

    return content?.client?.files
}


export function constructRoutes(root: string, stores: string[]) {
    const escapedRoot = normalize(root).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedRoot);
    const escapedSep = sep === '\\' ? '\\\\' : sep;
    const firstSlashRegex = new RegExp(`^[${escapedSep}]`);
    return stores.map(store => store.replace(regex, '').replace(firstSlashRegex, ''))
}

export function constructRouteCallback(_import: any): (event: H3Event) => any {
    if (isClass(_import)) {
        const instance = new _import()
        return function eventHandler(event: H3Event) {
            try {
                switch (event.method) {
                    case "GET":
                        return instance?.get(event)
                    case "POST":
                        return instance?.post(event)
                    case "PUT":
                        return instance?.put(event)
                    case "DELETE":
                        return instance?.delete(event)
                    case "PATCH":
                        return instance?.patch(event)
                    case "CONNECT":
                        return instance?.connect(event)
                    case "OPTIONS":
                        return instance?.options(event)
                    case "TRACE":
                        return instance?.trace(event)
                    case "HEAD":
                        return instance?.head(event)
                    default:
                        throw new Error("Method not allowed")
                }
            } catch (e) {
                return e.message || e
            }
        }
    } else {
        return function eventHandler(event: H3Event) {
            return _import(event)
        }
    }
}

export function prependSlash(route: string) {
    return (route.startsWith('/') ? route : `/${route}`).replace(sep, '/').replace(/\.[jt]s$/, '')
}

function isClass(obj: any) {
    const isCtorClass = obj.constructor
        && obj.constructor.toString().substring(0, 5) === 'class'
    if (obj.prototype === undefined) {
        return isCtorClass
    }
    const isPrototypeCtorClass = obj.prototype.constructor
        && obj.prototype.constructor.toString
        && obj.prototype.constructor.toString().substring(0, 5) === 'class'
    return isCtorClass || isPrototypeCtorClass
}
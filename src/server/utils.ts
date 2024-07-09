import { readdir, lstat, readFile } from 'fs/promises';
import { H3Event } from 'h3'
import { join, normalize, sep } from 'path'

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

export async function readArmonFile(): Promise<string | undefined> {
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

    return content?.server
}


export function constructRoutes(root: string, stores: string[]) {
    const escapedRoot = normalize(root).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedRoot);
    const escapedSep = sep === '\\' ? '\\\\' : sep;
    const firstSlashRegex = new RegExp(`^[${escapedSep}]`);
    return stores.map(store => store.replace(regex, '').replace(firstSlashRegex, ''))
}

export function constructRouteCallback(_import: any): (event: H3Event) => any {
    if (typeof _import === "function") {
        return _import
    } else {
        return function eventHandler(event: H3Event) {
            switch (event.method) {
                case "GET":
                    return _import?.get(event)
                case "POST":
                    return _import?.post(event)
                case "PUT":
                    return _import?.put(event)
                case "DELETE":
                    return _import?.delete(event)
                default:
                    return (event: H3Event) => `Method ${event.method} not supported`
            }
        }
    }
}

export function prependSlash(route: string) {
    return (route.startsWith('/') ? route : `/${route}`).replace(sep, '/').replace(/\.[jt]s$/, '')
}
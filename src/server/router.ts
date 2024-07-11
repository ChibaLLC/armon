import { getStores, getServerFilesLocation, constructRoutes, constructRouteCallback, prependSlash as cleanRoute, getClientsFilesLocation } from "./utils";
import { createRouter, defineEventHandler, Router } from "h3";
import { join, normalize } from 'node:path';
import chokidar from "chokidar";
import consola from "consola";

async function makeRoutes(serverFilesLocation: string) {
    const router = createRouter()
    const stores = await getStores(serverFilesLocation!)
    const paths = constructRoutes(serverFilesLocation!, stores)
    const functions = new Map<string, string[]>()

    for (let path of paths) {
        const imports = await import(normalize(join(process.cwd(), serverFilesLocation, path)))
        const route = cleanRoute(path)
        if (imports.default) {
            consola.info(`Adding route: ${route}`)
            const callback = constructRouteCallback(imports.default)
            router.use(route, defineEventHandler(callback))
        } else {
            for (const key in imports) {
                if (key === 'default' || key === '__is_handler__') continue
                consola.info(`Adding route: ${route}/${key}`)
                const callback = constructRouteCallback(imports[key])
                router.use(`${route}/${key}`, defineEventHandler(callback))
            }
        }

        functions.set(route, Object.keys(imports))
    }

    return { router, functions }
}


async function watchFiles(
    callback: (clientFolder: string, router: Router, functions: Map<string, string[]>) => void
) {
    const serverFilesLocation = await getServerFilesLocation()
    if (!serverFilesLocation) return consola.error(`Server files location not found`)
    const clientFolder = await getClientsFilesLocation()
    if (!clientFolder) return consola.error(`Client files location not found`)

    const watcher = chokidar.watch(serverFilesLocation, {
        ignored: /node_modules/,
        persistent: true
    })

    const routes = async () => await makeRoutes(serverFilesLocation)
    watcher.on('change', async function (path) {
        consola.info(`File changed: ${path}`)
        const changes = await routes()
        if (changes) {
            callback(clientFolder, changes.router, changes.functions)
        } else {
            consola.error(`Routes not updated`)
        }
        consola.info(`Routes updated`)
    })
}

export { makeRoutes, watchFiles }
import { getStores, getServerFilesLocation, constructRoutes, constructRouteCallback, prependSlash as cleanRoute, getClientsFilesLocation, getServerEndpoint } from "./utils";
import { createRouter, defineEventHandler, Router } from "h3";
import { join, normalize } from 'node:path';
import { pathToFileURL } from "node:url";
import chokidar from "chokidar";
import consola from "consola";

function getFileUrl(path: string, root: string) {
    return pathToFileURL(join(root, path)).href
}

async function makeRoutes(serverFilesLocation: string) {
    const router = createRouter()
    const stores = await getStores(serverFilesLocation!)
    const paths = constructRoutes(serverFilesLocation!, stores)
    const functions = new Map<string, string[]>()

    for (let path of paths) {
        const imports = await import(normalize(getFileUrl(path, serverFilesLocation)))
        const route = cleanRoute(path)
        if (imports.default) {
            consola.info(`Adding default route: ${route}`)
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
    callback: (config: { clientFolder: string; router: Router; functions: Map<string, string[]>, serverEndpoint: string }) => void
) {
    const serverFilesLocation = await getServerFilesLocation()
    if (!serverFilesLocation) return consola.error(`Server files location not found`)
    const clientFolder = await getClientsFilesLocation()
    if (!clientFolder) return consola.error(`Client files location not found`)
    const serverEndpoint = await getServerEndpoint()

    const watcher = chokidar.watch(serverFilesLocation, {
        ignored: /node_modules/,
        persistent: true
    })

    const buildRoutes = async (path: string) => {
        consola.info(`File changed: ${path}`)
        const changes = await routes()
        if (changes) {
            callback({ clientFolder, router: changes.router, functions: changes.functions, serverEndpoint: serverEndpoint })
        } else {
            consola.error(`Routes not updated`)
        }
        consola.info(`Routes updated`)
    }

    const routes = async () => await makeRoutes(serverFilesLocation)
    watcher.on('change', buildRoutes)
    const init = await routes()
    callback({ clientFolder, router: init.router, functions: init.functions, serverEndpoint: serverEndpoint })
}

export { makeRoutes, watchFiles }
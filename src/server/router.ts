import { getStores, getServerFilesLocation, constructRoutes, constructRouteCallback, prependSlash as cleanRoute } from "./utils";
import { createRouter, defineEventHandler } from "h3";
import { join, normalize } from 'node:path';
import consola from "consola";

async function makeRoutes() {
    const serverFilesLocation = await getServerFilesLocation()
    const router = createRouter()
    const stores = await getStores(serverFilesLocation!)
    const paths = constructRoutes(serverFilesLocation!, stores)
    const functions = new Map<string, string[]>()

    for (let path of paths) {
        const imports = await import(normalize(join(process.cwd(), serverFilesLocation!, path)))
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

export { makeRoutes }
import { getStores, readArmonFile, constructRoutes, constructRouteCallback, prependSlash as cleanRoute } from "./utils";
import { createRouter, defineEventHandler } from "h3";
import { join, normalize } from 'node:path'

const serverFilesLocation = await readArmonFile()
const router = createRouter()

async function makeEndpoints(){
    for (let route of constructRoutes(serverFilesLocation!, await getStores(serverFilesLocation!))) {
        const imports = await import(normalize(join(process.cwd(), serverFilesLocation!, route)))
        route = cleanRoute(route)
        if (imports.default) {
            console.log(`Adding route ${route}`)
            const callback = constructRouteCallback(imports.default)
            router.use(route, defineEventHandler(callback))
        }
    
        for (const key in imports) {
            if (key === 'default') continue
            console.log(`Adding route ${route}/${key}`)
            const callback = constructRouteCallback(imports[key])
            router.use(`${route}/${key}`, defineEventHandler(callback))
        }
    }
}

await makeEndpoints()

export { router }
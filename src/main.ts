import { app } from "./server";
import { H3CorsOptions, H3Event, handleCors } from "h3";
import { listen } from "listhen";
import { getSpecifiedClient, getSpecifiedServer } from "./server/utils";

const server = getSpecifiedServer()
const client = getSpecifiedClient()

async function handler(req: any, res: any) {
    const event = new H3Event(req, res)
    app.handler(event)
}

async function handlerWithCors(req: any, res: any, { host, port, secure }: { host: string, port: number, secure?: boolean }) {
    const event = new H3Event(req, res)
    const corsOptions = {
        origin: [`${secure ? "https" : "http"}://${host}:${port}`],
        credentials: true,
        allowHeaders: "*"
    } satisfies H3CorsOptions

    const cors = handleCors(event, corsOptions)
    if (cors) return console.info(`CORS Headers appended for ${event.method} ${event.path}`)
    const time = Date.now()
    try {
        var _res = await app.handler(event)
    } catch (e) {
        event.node.res.statusCode = e.statusCode || 500
        console.error(e?.message || e)
        event.node.res.end(e.message)
        return
    } finally {
        const duration = Date.now() - time
        console.info(`${event.method} ${event.path} ${event.node.res.statusCode} ${duration}ms`)
    }
    return _res
}


server.then(async ({ host, port }) => {
    const _client = await client
    if (_client.host !== host || _client.port !== port) {
        listen((req: any, res: any) => {
            handlerWithCors(req, res, { port: _client.port, host: _client.host })
        }, { port, hostname: host })
    } else {
        listen(handler, { port, hostname: host })
    }
})



import { app } from "./server/main";
import { H3Event, handleCors } from "h3";
import { listen } from "listhen";
import { getSpecifiedClient, getSpecifiedServer } from "./server/utils";

const server = getSpecifiedServer()
const client = getSpecifiedClient()

async function handler(req: any, res: any) {
    const event = new H3Event(req, res)
    app.handler(event)
}

async function handlerWithCors(req: any, res: any, { host, port }: { host: string, port: number }) {
    const event = new H3Event(req, res)
    handleCors(event, {
        origin: [`http://${host}:${port}`],
        credentials: true,
        allowHeaders: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    })
    app.handler(event)
}


server.then(async ({ host, port }) => {
    const _client = await client
    if (_client.host !== host || _client.port !== port) {
        listen((req: any, res: any) => {
            handlerWithCors(req, res, { port, host: host })
        }, { port, hostname: host })
    } else {
        listen(handler, { port, hostname: host })
    }
})



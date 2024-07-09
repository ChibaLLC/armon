import { app } from "./server";
import { H3Event  } from "h3";
import { listen } from "listhen";

function handler(req: any, res: any) {
    const event = new H3Event(req, res)
    app.handler(event)
}


export default listen.bind(null, handler)



import { H3Event } from "h3";

export function post(event: H3Event){
    return [
        {
            title: "Hello World",
            body: "This is a post"
        }
    ]
}
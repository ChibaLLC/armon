import { H3Event } from "h3";
import { getPosts } from "./queries";

export function posts(event: H3Event){
    return getPosts()
}
export function post(event: H3Event){
    return getPosts()?.allan
}
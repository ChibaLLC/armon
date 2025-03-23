import { eventHandler } from "vinxi/http";
import router from ".";

// @ts-ignore
export default eventHandler(router.handler);

import { eventHandler } from "vinxi/http";
import router from ".";

export default eventHandler(router.handler);

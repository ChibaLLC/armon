import { createApp } from "h3";
import { router } from "./server";

const app = createApp()
app.use(router)

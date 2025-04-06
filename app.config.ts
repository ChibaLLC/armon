import { createApp } from "vinxi";
import armonConfig from "./armon.config";
import consola from "consola";

export default createApp({
	routers: [
		{
			name: "public",
			type: "static",
			dir: `${armonConfig.client.folder}/public`,
		},
		{
			name: "client",
			type: "spa",
			handler: `${armonConfig.client.folder}/index.html`,
			base: "/",
			plugins: armonConfig.client.plugins,
		},
		{
			name: "api",
			type: "http",
			base: armonConfig.server.api?.base || "/api",
			plugins: armonConfig.server.plugins || [],
			handler: "./src/server/handler.ts",
		},
	],
	server: {
		hooks: {
			dev: {
				start() {
					consola.info("Server started");
				},
			},
		},
	},
	devtools: true,
});
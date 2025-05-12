import { createApp } from "vinxi";
import armonConfig from "./armon.config";
import consola from "consola";
import type { Router, App } from "vinxi/http";
import { makeRoutes } from "./src/server/router";
import { getServerFilesLocation } from "./src/server/utils";

export default createApp({
	routers: [
		{
			name: "customRouter",
			type: {
				async resolveConfig(_router: Router, _: App): Promise<Router> {
					const { router } = await makeRoutes(_router, await getServerFilesLocation());
					return router;
				},
			},
			target: "server",
			handler: "./src/server/handler.ts",
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

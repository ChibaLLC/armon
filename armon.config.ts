import { config } from "vinxi/plugins/config";

export default {
	server: {
		folder: "./playground/server",
		port: 3000,
		host: "localhost",
		api: {
			base: "/api",
		},
		plugins: () => [],
	},
	client: {
		folder: "./playground",
		port: 5500,
		host: "localhost",
		plugins: () => [
			config("custom", {
				// additional vite options
			}),
			// additional vite plugins
		],
	},
};

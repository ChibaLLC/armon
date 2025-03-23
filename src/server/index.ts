import { Router } from "h3";
import { watchFiles } from "./router";
import consola from "consola";
import { join } from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";
import { addToProjectGitignore } from "./utils";

async function constructTypes(config: {
	clientFolder: string;
	router: Router;
	functions: Map<string, string[]>;
	serverEndpoint: string;
}) {
	const utilsPath = join(config.clientFolder, "utils.js");
	const exists = await access(utilsPath)
		.then(() => true)
		.catch(() => false);
	if (!exists) {
		await mkdir(join(config.clientFolder), { recursive: true });
	}

	let typeFile = "";
	for (let location of config.functions.keys()) {
		const _locations = location.split("/");
		const className = _locations[1];
		const isStore = _locations.at(-1) === "store";
		if (!className) throw new Error("Invalid route found " + location);
		let _functions = config.functions.get(location);
		const type = "";
		typeFile += ``;

		const destination = join(config.clientFolder, ".armon", "types.d.ts");
		addToProjectGitignore(join(config.clientFolder, ".armon"));
		await writeFile(destination, typeFile).catch((e) => {
			console.error(e);
			throw new Error("Could not write file to the client folder");
		});

		consola.success("Server started");
	}
}
const { router } = await watchFiles(constructTypes);
export default router;

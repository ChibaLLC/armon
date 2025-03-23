import { readdir, lstat, readFile, mkdir } from "fs/promises";
import { createError, H3Event } from "h3";
import { join, normalize, sep } from "node:path";
import { getPort } from "get-port-please";
import { createInterface } from "node:readline/promises";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import consola from "consola";

export interface ArmonFile {
	server: Base;
	client: Base;
}
interface Base {
	folder: string;
	port: number;
	host: string;
}

const armon = import(join(process.cwd(), "armon.config.ts")).catch((e) => {
	const error = new Error(
		"Armon File Not Found. Please add it with a key 'server' containing your server files directory in the root of your projet"
	);
	error.name = "ArmonFileNotFound";
	// @ts-expect-error
	error.cause = e;
	throw error;
}) as Promise<ArmonFile>;

async function isIgnored(base: string, location: string) {
	const ignored = [".git", "node_modules", "dist"];

	return (
		ignored.includes(location) ||
		(!/[A-Z]/.test(location.charAt(0)) && location.toLowerCase() !== "store.ts")
	);
}

/**
 * Returns an array of string of valid relative path to store.ts files within capitalised Folders names in origin
 * @param {string} base the root directory
 * @param {Array<string>} path (unused during initiation) the paths to the store.ts files within the directory
 * @returns
 */
export async function getStores(base: string, path?: string[]): Promise<string[]> {
	if (!path) path = [];
	if (!base?.trim()) return path;

	const stats = await lstat(base).catch((_) => null);
	if (stats && !stats.isDirectory()) {
		path.push(base);
		return path;
	} else if (!stats) {
		throw new Error("Unable to read atrributes of " + base);
	}

	const items = await readdir(base);

	items.forEach(async (item) => {
		if (await isIgnored(base, item)) return;
		const location = join(base, item);
		await getStores(location, path);
	});

	return path;
}

export async function getServerFilesLocation(): Promise<string | undefined> {
	const location = (await armon)?.server?.folder || join(process.cwd(), "server");
	const stats = await lstat(location).catch((_) => null);
	if (stats && stats.isDirectory()) {
		return location;
	}
	await mkdir(location, { recursive: true });
	return location;
}

export async function getSpecifiedServer(): Promise<{
	host: string;
	port: number;
	secure?: boolean;
}> {
	return (
		(await armon)?.server || {
			host: "localhost",
			port: await getPort({ portRange: [3000, 4000], port: 3000 }),
		}
	);
}

export async function getServerEndpoint(): Promise<string> {
	const server = await getSpecifiedServer();
	if (server.secure) {
		return `https://${server.host}:${server.port}`;
	}
	return `http://${server.host}:${server.port}`;
}

export async function getSpecifiedClient(): Promise<{
	host: string;
	port: number;
	secure?: boolean;
}> {
	return (
		(await armon)?.client || {
			host: "localhost",
			port: await getPort({ portRange: [4000, 5000], port: 4000 }),
		}
	);
}

export async function getClientsFilesLocation(): Promise<string | undefined> {
	const location = (await armon)?.client?.folder || join(process.cwd(), "client");
	const stats = await lstat(location).catch((_) => null);
	if (stats && stats.isDirectory()) {
		return location;
	}
	await mkdir(location, { recursive: true });
	return location;
}

export function constructRoutes(root: string, stores: string[]) {
	const escapedRoot = normalize(root).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(escapedRoot);
	const escapedSep = sep === "\\" ? "\\\\" : sep;
	const firstSlashRegex = new RegExp(`^[${escapedSep}]`);
	return stores.map((store) => store.replace(regex, "").replace(firstSlashRegex, ""));
}

export function constructRouteCallback(_import: any): (event: H3Event) => any {
	function callMethod(_class: any, method: string, event: H3Event) {
		if (_class[method]) {
			return _class[method](event);
		} else {
			const _new = new _class();
			if (_new[method]) {
				return _new[method](event);
			} else {
				throw new Error("Method not found");
			}
		}
	}
	if (isClass(_import)) {
		return function eventHandler(event: H3Event) {
			switch (event.method) {
				case "GET":
					return callMethod(_import, "get", event);
				case "POST":
					return callMethod(_import, "post", event);
				case "PUT":
					return callMethod(_import, "put", event);
				case "DELETE":
					return callMethod(_import, "delete", event);
				case "PATCH":
					return callMethod(_import, "patch", event);
				case "CONNECT":
					return callMethod(_import, "connect", event);
				case "OPTIONS":
					return callMethod(_import, "options", event);
				case "TRACE":
					return callMethod(_import, "trace", event);
				case "HEAD":
					return callMethod(_import, "head", event);
				default:
					throw createError({
						status: 405,
						message: "Method not allowed",
					});
			}
		};
	} else {
		return function eventHandler(event: H3Event) {
			return _import(event);
		};
	}
}

export function prependSlash(route: string) {
	return (route.startsWith("/") ? route : `/${route}`).replace(sep, "/").replace(/\.[jt]s$/, "");
}

function isClass(obj: any) {
	const isCtorClass = obj.constructor && obj.constructor.toString().substring(0, 5) === "class";
	if (obj.prototype === undefined) {
		return isCtorClass;
	}
	const isPrototypeCtorClass =
		obj.prototype.constructor &&
		obj.prototype.constructor.toString &&
		obj.prototype.constructor.toString().substring(0, 5) === "class";
	return isCtorClass || isPrototypeCtorClass;
}

export async function addToProjectGitignore(location: string) {
	const gitignore = join(process.cwd(), ".gitignore");
	if (!(await lstat(gitignore).catch(() => null))) {
		consola.warn("No .gitignore file found in project root");
		return;
	}
	const rs = createReadStream(gitignore);
	const rl = createInterface({ input: rs });
	let hasLocation = false;
	for await (const line of rl) {
		if (line === location) {
			hasLocation = true;
			break;
		}
	}

	if (!hasLocation) {
		await writeFile(gitignore, `${location}\n`, { flag: "a" });
	}

	rs.close();
	return;
}

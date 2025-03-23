import { ofetch } from "ofetch";

const apiBase = {}; // Root object for the proxy

const apiHandler: ProxyHandler<any> = {
    get(target, property) {
        return new Proxy(() => {}, {
            get(_, key) {
                if (["get", "post", "put", "delete", "patch"].includes(String(key))) {
                    return async (payload: any = {}) => {
                        const url = target.__path || `/${String(property)}`;
                        const options = {
                            method: String(key).toUpperCase(),
                            ...(key === "get" ? { params: payload } : { body: payload })
                        };
                        return ofetch(url, options);
                    };
                }

                return new Proxy(
					{ __path: `${target.__path || `/${String(property)}`}/${String(key)}` },
					apiHandler
				);
            },
            apply(_, __, args) {
                if (args.length === 1) {
                    return new Proxy({ __path: `${target.__path}/${args[0]}` }, apiHandler);
                }
            }
        });
    }
};

const api = new Proxy(apiBase, apiHandler);

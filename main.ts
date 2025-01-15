import { load, dump } from "js-yaml";
import { generateTypeScript } from "./generateTypescript";
import { deref } from "./deref";
import { generateApiDocs } from "./summary";
import { OpenapiDocument, PathItem } from "./types";
import { getOperations } from "./getOperations";

const generateOverview = (openapi: OpenapiDocument): string => {
  const output: string[] = [];

  // Helper to get server origin from operation or root servers
  const getServerOrigin = (operation: any, rootServers: any[]): string => {
    const servers = operation?.servers || rootServers || [];
    if (servers.length === 0) return "";
    try {
      const url = new URL(servers[0].url);
      return url.origin;
    } catch (e) {
      return servers[0].url.split("/")[0];
    }
  };

  // Add API general info
  if (openapi.info) {
    const { title, version, description } = openapi.info;
    const serverOrigin = getServerOrigin(undefined, openapi.servers || []);
    output.push(`${title} v${version} - ${serverOrigin}`);
    if (description) output.push(description);
    output.push("");
  }

  // Process each path and operation
  if (openapi.paths) {
    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      const methods = ["get", "post", "put", "patch", "delete"];

      for (const method of methods) {
        const operation = pathItem[method as keyof typeof pathItem];
        if (!operation) continue;

        const serverOrigin = getServerOrigin(operation, openapi.servers || []);
        const operationId = operation.operationId
          ? `${operation.operationId}: `
          : "";

        // Build query parameters string
        const queryParams = operation.parameters
          ?.filter((p) => p.in === "query")
          ?.map((p) => `${p.name}=${p.schema?.type || p.name}`)
          ?.join("&");

        const queryString = queryParams ? `?${queryParams}` : "";

        output.push(
          `- ${operationId}${method.toUpperCase()} ${serverOrigin}${path}${queryString} - ${
            operation.summary || ""
          }`,
        );
      }
    }
  }

  return output.join("\n");
};
/** NB: Not sure on the ratelimit on this, or logging */
export const convertSwaggerToOpenapi = async (swaggerUrl: string) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);
  const result = await fetch(
    `https://converter.swagger.io/api/convert?url=${swaggerUrl}`,
    { signal: abortController.signal },
  )
    .then((res) => res.json() as Promise<OpenapiDocument>)
    .catch((e) => {
      return undefined;
    });

  clearTimeout(timeoutId);

  return result;
};

const matchOperation = (openapi: OpenapiDocument, url: URL) => {
  if (!openapi.paths) {
    return;
  }

  // First try direct path match
  const directMatch = openapi.paths[url.pathname]?.get;
  if (directMatch) {
    return {
      operation: directMatch,
      originalPath: url.pathname,
      method: "GET",
    };
  }

  const normalizedPathname = url.pathname.slice(1) as keyof PathItem;

  // Then try operationId match
  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    // Check if any method's operationId matches the pathname
    const matchingMethod = ["get", "post", "put", "patch", "delete"].find(
      (httpMethod) => {
        const operation = pathItem?.[httpMethod as keyof typeof pathItem];
        return operation?.operationId === normalizedPathname;
      },
    );

    if (matchingMethod) {
      return {
        operation: pathItem[matchingMethod as keyof typeof pathItem],
        originalPath: path,
        method: matchingMethod.toUpperCase(),
      };
    }
  }

  // Finally try regex path matching
  const pathPatterns = Object.keys(openapi.paths).map((path) => {
    const foundMethod = ["get", "post", "delete", "patch", "put"].find(
      (m) => (openapi.paths[path] as any)?.[m],
    );

    if (!foundMethod) {
      return;
    }

    return {
      pattern: convertPathToRegex(path),
      operation: (openapi.paths[path] as any)![foundMethod],
      method: foundMethod?.toUpperCase(),
      originalPath: path,
    };
  });

  const match = pathPatterns
    .filter((x) => !!x)
    .find(({ pattern }) => pattern.test(url.pathname));

  return match;
};

const convertPathToRegex = (path: string): RegExp => {
  // Replace path parameters {param} with regex capture groups
  const regexPattern = path
    // Escape forward slashes
    .replace(/\//g, "\\/")
    // Replace path parameters with regex capture groups
    .replace(/\{([^}]+)\}/g, "([^/]+)")
    // Add start and end anchors
    .replace(/^/, "^")
    .replace(/$/, "$");

  return new RegExp(regexPattern);
};

/**
 * try-catches js-yaml to turn the yamlString into JSON
 */
export const tryParseYamlToJson = <T = any>(yamlString: string): T | null => {
  try {
    const document = load(yamlString);
    return document as T;
  } catch (e: any) {
    return null;
  }
};

const tryParseUrl = (url: string) => {
  try {
    return new URL(url).toString();
  } catch (e) {
    return;
  }
};

const removeCommentsRegex = /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g;

/**
 * if text isn't json, returns null
 */
export const tryParseJson = <T extends unknown>(
  text: string,
  logParseError?: boolean,
): T | null => {
  try {
    const jsonStringWithoutComments = text.replace(
      removeCommentsRegex,
      (m, g) => (g ? "" : m),
    );
    return JSON.parse(jsonStringWithoutComments) as T;
  } catch (parseError) {
    if (logParseError) console.log("JSON Parse error:", parseError);
    return null;
  }
};

/**
 * Get a subset of the OpenAPI document for a specific route
 */
const getOpenAPISubset = (openapi: OpenapiDocument, route: string) => {
  if (!route || !openapi.paths) {
    return openapi;
  }

  const matchingPaths: Record<string, any> = {};

  // Match by path or operationId
  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    if (path === route || pathItem?.get?.operationId === route) {
      matchingPaths[path] = pathItem;
      break;
    }
  }

  return {
    ...openapi,
    paths: matchingPaths,
  };
};

export default {
  fetch: async (request: Request) => {
    const url = new URL(request.url);
    const accept =
      request.headers.get("accept") || url.searchParams.get("accept");

    const [type, hostname, ...rest] = url.pathname.split("/").slice(1);
    const route = rest.length ? "/" + rest.join("/") + url.search : "";

    if (
      ![
        "request",
        "response",
        "summary",
        "openapi",
        "ts",
        "cjs",
        "esm",
        "operations",
        "overview",
      ].includes(type) ||
      !hostname
    ) {
      return new Response(
        `Please use the format [type]/[hostname]/[idOrRoute]`,
        { status: 400 },
      );
    }

    const realHostname =
      hostname.split(".").length === 1 ? hostname + ".com" : hostname;

    const openapiUrl = tryParseUrl(`https://${realHostname}/openapi.json`);

    if (!openapiUrl) {
      return new Response("Invalid hostname", { status: 400 });
    }

    try {
      const openapiJson = await fetch(openapiUrl)
        .then(async (res) => {
          if (!res.ok) {
            return;
          }

          const text = await res.text();

          const json = tryParseJson(text);

          if (json && (json as any).paths) {
            return json as OpenapiDocument;
          }

          const yamlJson = tryParseYamlToJson(text);

          if (yamlJson && (yamlJson as any).paths) {
            return yamlJson as OpenapiDocument;
          }

          return;
        })
        .catch((e) => {
          return undefined;
        });

      if (!openapiJson) {
        return new Response("could not parse OpenAPI", { status: 404 });
      }

      const isSwagger =
        (openapiJson as any)?.swagger ||
        !openapiJson?.openapi ||
        !openapiJson?.openapi.startsWith("3.");

      const convertedOpenapi = isSwagger
        ? await convertSwaggerToOpenapi(openapiUrl)
        : openapiJson;

      if (!convertedOpenapi?.openapi) {
        return new Response("conversion failed", { status: 404 });
      }

      // Handle openapi type separately
      if (type === "openapi") {
        const subset = getOpenAPISubset(convertedOpenapi, route.slice(1)); // Remove leading slash

        if (accept === "text/yaml") {
          return new Response(dump(subset), {
            status: 200,
            headers: { "Content-Type": "text/yaml" },
          });
        }

        return new Response(JSON.stringify(subset, undefined, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (type === "overview") {
        const subset = getOpenAPISubset(convertedOpenapi, route.slice(1)); // Remove leading slash

        const overview = generateOverview(subset);
        return new Response(overview, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (type === "operations") {
        const subset = getOpenAPISubset(convertedOpenapi, route.slice(1)); // Remove leading slash

        const operations = getOperations(subset as any, openapiUrl, openapiUrl);

        if (!operations) {
          return new Response("Could not convert openapi to operations", {
            status: 500,
          });
        }
        return new Response(JSON.stringify(operations, undefined, 2), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (type === "summary") {
        // TODO; dereference first becuase it may miss things otherwise. now it somehow fails when doing that, it seems some things go missing when dereferencing
        //  const dereferenced = await deref(convertedOpenapi, openapiUrl);
        return new Response(
          generateApiDocs(convertedOpenapi as OpenapiDocument),
        );
      }

      const operationIds = Object.values(convertedOpenapi.paths)
        .map((item) =>
          [
            item.get?.operationId,
            item.post?.operationId,
            item.delete?.operationId,
            item.put?.operationId,
            item.patch?.operationId,
          ]
            .filter(Boolean)
            .map((x) => x!),
        )
        .flat();
      const routes = Object.keys(convertedOpenapi.paths);

      // Handle other types
      const fullRequestUrl = `https://${realHostname}${route}`;
      const op = matchOperation(convertedOpenapi, new URL(fullRequestUrl));
      console.log({ op });
      if (!op?.operation) {
        return new Response(
          `Operation wasn't found. Please specify a operation using an operationId or route
          
The available IDs are: 
${operationIds.map((x) => `- ${x}`).join("\n")}

The routes are:
${routes.map((x) => `- ${x}`).join("\n")}`,
          { status: 404 },
        );
      }

      if (type === "ts") {
        // first take the openapi and parse it in a way such that we have the input type and response type as a JSON with JSON schemas
        // then, it should generate types:
        // type RequestType = { headers:{[name:string]:string}, query:{[name:string]:string}, path:{[name:string]:string}, body:{[name:string]:any} }
        // type ResponseType = { status:number; headers: {[name:string]:string}, body:any }
        // should generate a JS-only (web standard, no node) typescript file that has the types a default export of (request:RequestType)=>Promise<ResponseType> that fetches the OpenAPI in the right way

        const typescript = generateTypeScript(
          convertedOpenapi,
          op.method,
          op.operation,
          op.originalPath,
          openapiUrl,
          true,
        );
        return new Response(typescript, {
          status: 200,
          headers: { "Content-Type": "text/typescript" },
        });
      }

      if (type === "esm") {
        const typescript = generateTypeScript(
          convertedOpenapi,
          op.method,
          op.operation,
          op.originalPath,
          openapiUrl,
          true,
        );

        const javascript = (
          await fetch("https://swcapi.com/swc/strip-types", {
            method: "POST",
            body: JSON.stringify([typescript]),
          }).then((res) => res.json())
        )?.[0] as string;

        return new Response(javascript, {
          status: 200,
          headers: { "Content-Type": "text/javascript" },
        });

        // Same as ts but types stripped
      }

      if (type === "cjs") {
        const typescript = generateTypeScript(
          convertedOpenapi,
          op.method,
          op.operation,
          op.originalPath,
          openapiUrl,
        );

        const javascript = (
          await fetch("https://swcapi.com/swc/strip-types?cjs=true", {
            method: "POST",
            body: JSON.stringify([typescript]),
          }).then((res) => res.json())
        )?.[0] as string;

        return new Response(javascript, {
          status: 200,
          headers: { "Content-Type": "text/javascript" },
        });

        // Same as ts but types stripped
      }

      const json =
        type === "response"
          ? await deref(
              (
                (await deref(
                  op.operation.responses?.["200"],
                  openapiUrl,
                )) as any
              )?.content?.["application/json"]?.schema,
              openapiUrl,
            )
          : {
              path: op.originalPath,
              parameters: await deref(
                op.operation.parameters || [],
                openapiUrl,
              ),
            };

      if (!json) {
        return new Response(`not found`, { status: 404 });
      }

      if (accept === "text/yaml") {
        return new Response(dump(json), {
          status: 200,
          headers: { "Content-Type": "text/yaml" },
        });
      }

      return new Response(JSON.stringify(json, undefined, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response("Couldn't parse OpenAPI; " + e.message, {
        status: 400,
      });
    }
  },
};

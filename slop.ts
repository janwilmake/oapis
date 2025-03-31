import { OpenapiDocument } from "./types.js";

export const generateOverview = (
  hostname: string,
  openapi: OpenapiDocument,
): string => {
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

  const items: {
    operationId: string;
    pathPart: string;
    summaryPart: string;
  }[] = [];

  // Process each path and operation
  if (openapi.paths) {
    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      const methods = ["get", "post", "put", "patch", "delete"];

      for (const method of methods) {
        const operation = pathItem[method as keyof typeof pathItem];
        if (!operation) continue;

        const serverOrigin = getServerOrigin(operation, openapi.servers || []);
        const operationId = operation.operationId
          ? `${operation.operationId}`
          : "";

        // Build query parameters string
        const queryParams = operation.parameters
          ?.filter((p) => p.in === "query")
          ?.map((p) => `${p.name}=${p.schema?.type || p.name}`)
          ?.join("&");

        const queryString = queryParams ? `?${queryParams}` : "";
        const summaryPart = operation.summary
          ? ` - ${operation.summary || ""}`
          : "";

        const pathPart = `${method.toUpperCase()} ${path}${queryString}`;

        items.push({ operationId, pathPart, summaryPart });
      }
    }
  }

  // 10k+ tokens
  const isLong = JSON.stringify(items).length > 10000 * 5;

  output.push(
    ...items.map((item) =>
      isLong
        ? `- ${item.operationId} ${item.summaryPart}`
        : `- ${item.operationId} ${item.pathPart}${item.summaryPart}`,
    ),
  );

  const endpointCount = output.length;

  output.unshift(
    `Below is an overview of the ${hostname} openapi in simple language. This API contains ${endpointCount} endpoints. For more detailed information of an endpoint, visit https://oapis.org/summary/${hostname}/[idOrRoute]`,
  );
  output.unshift("");

  return output.join("\n");
};

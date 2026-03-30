import { Readable } from "node:stream";
import streamObject from "stream-json/streamers/stream-object.js";
import parser from "stream-json/parser.js";

const PACKAGES_LIST_URL = "https://raw.githubusercontent.com/toolsdk-ai/toolsdk-mcp-registry/refs/heads/main/indexes/packages-list.json";
const MCP_REGISTRY_URL = "https://registry.modelcontextprotocol.io/v0/servers";

type McpPackageDetails = {
  category: string;
  validated: boolean;
  tools: Record<string, {
    name: string;
    description: string;
  }>
}

type McpPackage = {
  registryType: string;
  identifier: string;
  transport: { type: string };
  environmentVariables?: Array<{
    name: string;
    description: string;
    isRequired?: boolean;
    isSecret?: boolean;
  }>;
}

export type McpServer = {
  name: string;
  description: string;
  package: McpPackage;
  details?: McpPackageDetails;
}

type RawServer = { name: string; description: string; packages: McpPackage[] };

export async function searchMcpServers(keywords: string[]): Promise<McpServer[]> {
  const results = await Promise.all(keywords.map(keyword => {
    const url = `${MCP_REGISTRY_URL}?version=latest&search=${encodeURIComponent(keyword)}`;
    return fetch(url).then(r => r.json() as Promise<{ servers: Array<{ server: RawServer }> }>);
  }));

  // Collect unique servers, each with a single first npm+stdio package
  const serverMap = new Map<string, McpServer>();
  for (const { servers } of results) {
    for (const { server } of servers) {
      if (serverMap.has(server.name)) continue;
      const pkg = server.packages?.find(
        p => p.registryType === "npm" && p.transport?.type === "stdio"
      );
      if (pkg) {
        serverMap.set(server.name, {
          name: server.name,
          description: server.description,
          package: {
            registryType: pkg.registryType,
            identifier: pkg.identifier,
            transport: { type: pkg.transport.type },
            environmentVariables: pkg.environmentVariables,
          },
        });
      }
    }
  }

  const servers = Array.from(serverMap.values());

  // Fetch details for all found package identifiers in a single call
  const identifiers = servers.map(s => s.package.identifier);
  const detailsMap = identifiers.length > 0 ? await getMcpPackageDetails(identifiers) : {};

  // Merge details into each server
  return servers.map(server => {
    const details = detailsMap[server.package.identifier];
    return details ? { ...server, details } : server;
  });
}

async function getMcpPackageDetails(keys: string[]): Promise<Record<string, McpPackageDetails>> {
  const response = await fetch(PACKAGES_LIST_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch packages list: ${response.statusText}`);
  }

  const remaining = new Set(keys);
  const result: Record<string, McpPackageDetails> = {};

  const nodeStream = Readable.fromWeb(response.body as import("stream/web").ReadableStream);

  await new Promise<void>((resolve, reject) => {
    const parserStream = parser.asStream({ packKeys: true, packStrings: true, packNumbers: true });
    const streamerStream = streamObject.asStream({
      objectFilter: asm => remaining.has(asm.key as string),
    });

    streamerStream.on("data", ({ key, value }: { key: string; value: McpPackageDetails }) => {
      result[key] = value;
      remaining.delete(key);
      if (remaining.size === 0) {
        nodeStream.destroy();
        resolve();
      }
    });

    streamerStream.on("end", resolve);
    streamerStream.on("error", reject);
    parserStream.on("error", (err: Error) => {
      if (remaining.size === 0) resolve();
      else reject(err);
    });

    nodeStream.pipe(parserStream).pipe(streamerStream);
  });

  return result;
}

import type { Config } from "@mastra/core";
import { readFile, stat } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import { Readable } from "stream";

import { Handler } from "hono";
import mime from "mime";

const appsDir = join(process.cwd(), "apps");

function jsString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

async function injectGlobals(html: string, config: Config): Promise<string> {
  const apiPrefix = config.server?.apiPrefix || "/api";
  const token = process.env.MASTRA_AUTH_TOKEN ?? "";

  const script = `<script>
window.MASTRA_API_PREFIX=${jsString(apiPrefix)};
window.MASTRA_AUTH_TOKEN=${jsString(token)};
</script>`;

  const shmastraScript = `<script src="/shmastra/public/script/shmastra.js"></script>`;
  return html.replace("<head>", `<head>${script}${shmastraScript}`);
}

export const appIndexHandler =
  (config: Config): Handler =>
  async (c) => {
    const appName = c.req.param("appName") || "";
    const fullPath = join(appsDir, appName, "index.html");

    try {
      const data = await readFile(fullPath, "utf-8");
      const html = await injectGlobals(data, config);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };

export const appStaticHandler: Handler = async (c) => {
  const appName = c.req.param("appName") || "";
  const filePath = c.req.param("path") || "";
  const fullPath = join(appsDir, appName, filePath);

  try {
    await stat(fullPath);
    const nodeStream = createReadStream(fullPath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const mimeType = mime.getType(filePath) ?? "application/octet-stream";
    return new Response(webStream, {
      headers: { "Content-Type": mimeType },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};

// 308 redirect for the legacy /shmastra/apps/* path. Keeps bookmarks and
// agent-generated markdown links working now that the canonical path is
// /apps/<name>.
export const appLegacyRedirectHandler: Handler = (c) => {
  const appName = c.req.param("appName") || "";
  const rest = c.req.param("path");
  const qIndex = c.req.url.indexOf("?");
  const search = qIndex >= 0 ? c.req.url.slice(qIndex) : "";
  const target = rest ? `/apps/${appName}/${rest}${search}` : `/apps/${appName}${search}`;
  return c.redirect(target, 308);
};

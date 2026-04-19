import type { Config } from "@mastra/core";
import { readFile, stat } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { getPublicUrl } from "../env";
import { Handler } from "hono";
import mime from "mime";

const appsDir = join(process.cwd(), "apps");

function jsString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

async function injectGlobals(html: string, config: Config): Promise<string> {
  const publicUrl = await getPublicUrl();
  const serverUrl = publicUrl || `http://localhost:${config.server?.port || "4111"}`;
  const apiPrefix = config.server?.apiPrefix || "/api";
  const token = process.env.MASTRA_AUTH_TOKEN ?? "";

  const script = `<script>
window.MASTRA_SERVER_URL=${jsString(serverUrl)};
window.MASTRA_API_PREFIX=${jsString(apiPrefix)};
window.MASTRA_AUTH_TOKEN=${jsString(token)};
</script>`;

  return html.replace("<head>", `<head>${script}`);
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

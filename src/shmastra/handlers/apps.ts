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

  // We deliberately do NOT inject `window.MASTRA_AUTH_TOKEN` here. The
  // token belongs to the user who owns this sandbox; baking it into the
  // HTML response would let anyone who can fetch this URL pull it out.
  // Whoever renders the page for the actual viewer (e.g. Shmastra Cloud)
  // is responsible for injecting a per-viewer token before shmastra.js
  // runs.
  const script = `<script>
window.MASTRA_API_PREFIX=${jsString(apiPrefix)};
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

// Factory for a permanent (308) redirect handler. The target may contain
// `:param` tokens that get substituted from the matched route params, so
// e.g. `redirectHandler("/apps/:appName/:path")` mounted on
// `/shmastra/apps/:appName/:path{.+}` rewrites bookmarks to the canonical
// path. The original query string is preserved.
export const redirectHandler =
  (target: string): Handler =>
  (c) => {
    const resolved = target.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => c.req.param(name) ?? "");
    const qIndex = c.req.url.indexOf("?");
    const search = qIndex >= 0 ? c.req.url.slice(qIndex) : "";
    return c.redirect(`${resolved}${search}`, 308);
  };

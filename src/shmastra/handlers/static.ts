import { readFile } from "fs/promises";
import { join, extname } from "path";
import {findProjectRoot} from "../files";
import {Handler} from "hono";
import mime from "mime";

const rootDir = findProjectRoot();

export const staticHandler: Handler = async c => {
  const filePath = c.req.param("path") || "index.html";
  const fullPath = join(rootDir, "/src/shmastra/public", filePath);

  try {
    const data = await readFile(fullPath);
    const mimeType = mime.getType(filePath) ?? "application/octet-stream";
    return new Response(data, {
      headers: { "Content-Type": mimeType },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};

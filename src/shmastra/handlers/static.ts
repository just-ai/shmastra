import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { join } from "path";
import {findProjectRoot} from "../files";
import {Handler} from "hono";
import mime from "mime";

const rootDir = findProjectRoot();

export const staticHandler: Handler = async c => {
  const filePath = c.req.param("path") || "index.html";
  const fullPath = join(rootDir, "/src/shmastra/public", filePath);

  try {
    const info = await stat(fullPath);
    if (!info.isFile()) return new Response("Not found", { status: 404 });

    const mimeType = mime.getType(filePath) ?? "application/octet-stream";
    const stream = Readable.toWeb(createReadStream(fullPath)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(info.size),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};

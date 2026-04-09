import * as fs from 'node:fs'
import * as path from 'node:path'
import {getUploadDir, getWorkdir, getLocalFilePath, createUniqueFileName} from '../files'
import {Handler} from "hono";
import mime from 'mime';
import type {ApiRoute} from "@mastra/core/server";

type OpenApiOptions = NonNullable<Extract<ApiRoute, { handler: any }>["openapi"]>;

export const uploadHandler: Handler = async c => {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) {
        return c.json({ error: 'No file provided' }, 400);
    }

    const fileName = createUniqueFileName(file.name);
    const filePath = path.join(getUploadDir(), fileName);
    const writeStream = fs.createWriteStream(filePath);
    await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        file.stream().pipeTo(new WritableStream({
            write(chunk) { writeStream.write(chunk); },
            close() { writeStream.end(); },
            abort(err) { writeStream.destroy(err); },
        })).catch(reject);
    });

    fs.copyFileSync(filePath, path.join(getUploadDir(getWorkdir()), fileName));
    return c.json({ fileName });
}

export const getFileHandler: Handler = async c => {
    const fileName = c.req.param('fileName') || "";
    const filePath = getLocalFilePath(fileName);

    if (!fs.existsSync(filePath)) {
        return c.json({ error: 'File not found' }, 404);
    }

    const nodeStream = fs.createReadStream(filePath);
    const { Readable } = await import('node:stream');
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(webStream, {
        headers: { 'Content-Type': mime.getType(filePath) || 'application/octet-stream' },
    });
}

export const uploadOpenapi: OpenApiOptions = {
    summary: "Upload a file",
    description: "Upload a file using multipart form data. Returns the generated file name.",
    tags: ["Files"],
    requestBody: {
        required: true,
        content: {
            "multipart/form-data": {
                schema: {
                    type: "object",
                    properties: {
                        file: {
                            type: "string",
                            format: "binary",
                            description: "The file to upload",
                        },
                    },
                    required: ["file"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "File uploaded successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            fileName: {
                                type: "string",
                                description: "The generated file name",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "No file provided",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
    },
};

export const getFileOpenapi: OpenApiOptions = {
    summary: "Get a file by name",
    description: "Download a previously uploaded file by its file name.",
    tags: ["Files"],
    parameters: [
        {
            name: "fileName",
            in: "path",
            required: true,
            description: "The file name returned from the upload endpoint",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "File content",
            content: {
                "application/octet-stream": {
                    schema: {
                        type: "string",
                        format: "binary",
                    },
                },
            },
        },
        404: {
            description: "File not found",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
    },
};
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {getPublicUrl} from "./env";
import anyAscii from "any-ascii";
import {nanoid} from "nanoid";
import mime from "mime";

const WORKDIR_HOME = process.env.SHMASTRA_WORKDIR_HOME || path.join(os.tmpdir(), 'shmastra');

export async function resolveFileUrl(file: string, mimeType?: string): Promise<string> {
    if (!file.startsWith("http") && !file.startsWith("/")) {
        file = getLocalFileUrl(file);
    }

    const isApiPath = file.startsWith('/shmastra/api/files/')
    const fileMatch = isApiPath
        ? file.match(/^\/shmastra\/api\/files\/(.+)$/)
        : file.match(/^([^/].+)$/)
    if (!fileMatch) return file

    const fileName = fileMatch[1]

    // 1. PUBLIC_URL
    const publicUrl = await getPublicUrl();
    if (publicUrl && isApiPath) {
        // Disable until we understand what to do if file became unavailable in runtime
        //return `${publicUrl.replace(/\/$/, '')}/shmastra/api/files/${fileName}`
    }

    const filePath = getLocalFilePath(fileName);
    if (fs.existsSync(filePath)) {
        // 2. Base64 fallback
        try {
            const data = fs.readFileSync(filePath)
            mimeType = mimeType || mime.getType(filePath) || "application/octet-stream";
            console.log("creating base64")
            return `data:${mimeType};base64,${data.toString('base64')}`
        } catch {
            // give up, return original
        }
    }

    return file
}

export function findProjectRoot(dir: string = process.cwd()): string {
    let current = dir
    while (true) {
        if (fs.existsSync(path.join(current, 'package.json')) && !current.endsWith('.mastra/output')) return current
        const parent = path.dirname(current)
        if (parent === current) throw new Error(`Could not find project root from ${dir}`)
        current = parent
    }
}

export function getWorkdir(dir: string = findProjectRoot()): string {
    return path.join(WORKDIR_HOME, path.basename(dir))
}

export function getStorageDir(dir: string = findProjectRoot()): string {
    const res = path.join(dir, '.storage')
    fs.mkdirSync(res, { recursive: true })
    return res
}

export function createUniqueFileName(fileName: string) {
    const ext = path.extname(fileName)
    const base = path.basename(fileName, ext)
    return `${anyAscii(base)}-${nanoid(8)}${ext}`
}

export function downloadFile(fileName: string, buffer: Buffer) {
    fileName = createUniqueFileName(fileName);
    const filePath = path.join(getUploadDir(), fileName);
    fs.writeFileSync(filePath, buffer);
    return fileName;
}

export function getUploadDir(dir: string = process.cwd()): string {
    const uploadDir = path.join(dir, 'files')
    fs.mkdirSync(uploadDir, { recursive: true });
    return uploadDir
}

export function getLocalFilePath(file: string) {
    return path.join(process.cwd(), 'files', file);
}

export function getLocalFileUrl(file: string) {
    return `/shmastra/api/files/${file}`;
}

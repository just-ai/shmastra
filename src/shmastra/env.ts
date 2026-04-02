import { existsSync, readFileSync, writeFileSync } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import {execSync} from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const envPath = path.resolve(__dirname, '../../.env');
export const sandboxId = process.env.E2B_SANDBOX_ID;
export const isDevMode = process.env.NODE_ENV === "development";
export const isDryRun = process.env.DRY_RUN === "true";

let _packageManager: string | undefined;
export function getPackageManager(): string {
    if (!_packageManager) {
        try {
            execSync("pnpm --version", {stdio: "ignore"});
            _packageManager = "pnpm";
        } catch {
            _packageManager = "npm";
        }
    }
    return _packageManager;
}

let _publicUrl = process.env.PUBLIC_URL;
export async function getPublicUrl() {
    if (!_publicUrl && process.env.PUBLIC_URL) {
        _publicUrl = process.env.PUBLIC_URL;
    } else if (!_publicUrl && sandboxId) {
        const {mastra} = await import("../mastra");
        const port = mastra.getServer()?.port ?? process.env.PORT ?? 4111;
        _publicUrl = `https://${port}-${process.env.E2B_SANDBOX_ID}.e2b.app`;
    }
    return _publicUrl;
}

export function parseEnv(): Record<string, string> {
    if (!existsSync(envPath)) return {}
    return Object.fromEntries(
        readFileSync(envPath, 'utf8')
            .split('\n')
            .filter(l => l.includes('=') && !l.trim().startsWith('#'))
            .map(l => {
                const idx = l.indexOf('=')
                return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
            })
    )
}

export function writeEnvKey(key: string, value: string) {
    writeEnvKeys([{ key, value }])
}

export function writeEnvKeys(entries: Array<{ key: string; value: string }>) {
    if (entries.length === 0) return
    let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
    for (const { key, value } of entries) {
        const regex = new RegExp(`^${key}=.*`, 'm')
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value}`)
        } else {
            content = content.trimEnd() + (content ? '\n' : '') + `${key}=${value}\n`
        }
    }
    writeFileSync(envPath, content, 'utf8')
}

export function loadEnvToProcess(): void {
    const dotEnv = parseEnv()
    for (const [key, value] of Object.entries(dotEnv)) {
        if (!process.env[key]) {
            process.env[key] = value
        }
    }
}
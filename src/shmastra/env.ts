import { existsSync, readFileSync, writeFileSync } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import {execSync} from "node:child_process";
import {getMastra} from "./utils";

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
        const mastra = await getMastra();
        const port = mastra.getServer()?.port ?? process.env.PORT ?? 4111;
        _publicUrl = `https://${port}-${process.env.E2B_SANDBOX_ID}.e2b.app`;
    }
    return _publicUrl;
}

export function parseEnvContent(content: string): Record<string, string> {
    return Object.fromEntries(
        content
            .split('\n')
            .filter(l => l.includes('=') && !l.trim().startsWith('#'))
            .map(l => {
                const idx = l.indexOf('=')
                return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
            })
    )
}

export function parseEnv(): Record<string, string> {
    if (!existsSync(envPath)) return {}
    return parseEnvContent(readFileSync(envPath, 'utf8'))
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export function isValidEnvKey(key: string): boolean {
    return KEY_RE.test(key) && key !== 'undefined' && key !== 'null'
}

export function formatEnvValue(raw: string): string {
    if (/[\n\r"\\#]|^\s|\s$/.test(raw)) {
        const escaped = raw
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
        return `"${escaped}"`
    }
    return raw
}

type EnvSegment =
    | { kind: 'raw'; text: string }
    | { kind: 'kv'; key: string; value: string }

function parseEnvSegments(content: string): EnvSegment[] {
    const body = content.endsWith('\n') ? content.slice(0, -1) : content
    const lines = body.length ? body.split('\n') : []
    const segments: EnvSegment[] = []
    const seen = new Set<string>()
    for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (!match) { segments.push({ kind: 'raw', text: line }); continue }
        const key = match[1].trim()
        let value = match[2].trim()
        if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
            value = value.slice(1, -1).replace(/\\(.)/g, (_, c) =>
                c === 'n' ? '\n' : c === 'r' ? '\r' : c,
            )
        } else {
            value = value.replace(/\s+#.*$/, '')
        }
        if (seen.has(key)) continue
        seen.add(key)
        segments.push({ kind: 'kv', key, value })
    }
    return segments
}

export function updateEnvContent(
    existing: string,
    vars: Record<string, unknown>,
): string {
    const segments = parseEnvSegments(existing)
    const output: EnvSegment[] = []
    const written = new Set<string>()

    for (const seg of segments) {
        if (seg.kind === 'raw') { output.push(seg); continue }
        if (!isValidEnvKey(seg.key)) continue
        const hasOverride = Object.prototype.hasOwnProperty.call(vars, seg.key)
        if (hasOverride && vars[seg.key] == null) continue
        const value = hasOverride ? String(vars[seg.key]) : seg.value
        output.push({ kind: 'kv', key: seg.key, value })
        written.add(seg.key)
    }
    for (const [k, v] of Object.entries(vars)) {
        if (written.has(k) || v == null || !isValidEnvKey(k)) continue
        output.push({ kind: 'kv', key: k, value: String(v) })
    }

    if (output.length === 0) return ''
    return output.map(seg =>
        seg.kind === 'raw' ? seg.text : `${seg.key}=${formatEnvValue(seg.value)}`,
    ).join('\n') + '\n'
}

export function writeEnvKey(key: string, value: string) {
    writeEnvKeys([{ key, value }])
}

export function writeEnvKeys(entries: Array<{ key: string; value: string }>) {
    if (entries.length === 0) return
    const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
    const vars: Record<string, string> = {}
    for (const { key, value } of entries) vars[key] = value
    writeFileSync(envPath, updateEnvContent(existing, vars), 'utf8')
}

export function loadEnvToProcess(): void {
    const dotEnv = parseEnv()
    for (const [key, value] of Object.entries(dotEnv)) {
        if (!process.env[key]) {
            process.env[key] = value
        }
    }
}
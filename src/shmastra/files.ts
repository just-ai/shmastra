import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {getPublicUrl} from "./env";

// Items never copied to tmp (always excluded from sync)
const SKIP_COPY = new Set(['README.md', 'AGENTS.md', 'CLAUDE.md', '.git', '.gitignore', '.claude'])

// Items never deleted from dst, and never treated as gitignored
const ALWAYS_KEEP = new Set(['.env', 'node_modules', ...SKIP_COPY])

// Cache: fileName -> { url, uploadedAt (ms), fileMtime (ms) }
const tmpfilesCache = new Map<string, { url: string; uploadedAt: number; fileMtime: number }>();
const TMPFILES_TTL_MS = 60 * 60 * 1000; // tmpfiles.org keeps files for 1 hour

export async function resolveFileUrl(fileUrl: string, mimeType: string): Promise<string> {
    const isApiPath = fileUrl.includes('/shmastra/api/files/')
    const fileMatch = isApiPath
        ? fileUrl.match(/^\/shmastra\/api\/files\/(.+)$/)
        : fileUrl.match(/^([^/].+)$/)
    if (!fileMatch) return fileUrl

    const fileName = fileMatch[1]

    // 1. PUBLIC_URL env
    const publicUrl = await getPublicUrl();
    if (publicUrl && isApiPath) {
        return `${publicUrl.replace(/\/$/, '')}/shmastra/api/files/${fileName}`
    }

    // 2. Upload to tmpfiles.org (with cache)
    const filePath = getLocalFilePath(fileName);
    if (fs.existsSync(filePath)) {
        try {
            const fileMtime = fs.statSync(filePath).mtimeMs;
            const cached = tmpfilesCache.get(fileName);
            if (cached && cached.fileMtime === fileMtime && Date.now() - cached.uploadedAt < TMPFILES_TTL_MS) {
                return cached.url;
            }

            const data = fs.readFileSync(filePath)
            const form = new FormData()
            form.append('file', new Blob([data], { type: mimeType }), fileName)
            const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form })
            if (res.ok) {
                const json = await res.json() as { data?: { url?: string } }
                const url = json?.data?.url
                if (url) {
                    const resolvedUrl = url
                        .replace('tmpfiles.org/', 'tmpfiles.org/dl/')
                        .replace('http://', 'https://')
                    tmpfilesCache.set(fileName, { url: resolvedUrl, uploadedAt: Date.now(), fileMtime })
                    return resolvedUrl
                }
            }
        } catch {
            // fall through to base64
        }

        // 3. Base64 fallback
        try {
            const data = fs.readFileSync(filePath)
            return `data:${mimeType};base64,${data.toString('base64')}`
        } catch {
            // give up, return original
        }
    }

    return fileUrl
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

export function getTmpDir(dir: string = findProjectRoot()): string {
    return path.join(os.tmpdir(), 'shmastra', path.basename(dir))
}

export function getStorageDir(dir: string = findProjectRoot()): string {
    const res = path.join(dir, '.storage')
    fs.mkdirSync(res, { recursive: true })
    return res
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

async function syncFile(srcPath: string, dstPath: string): Promise<void> {
    const srcStat = await fs.promises.stat(srcPath)
    if (fs.existsSync(dstPath)) {
        const dstStat = await fs.promises.stat(dstPath)
        if (srcStat.size === dstStat.size && Math.round(srcStat.mtimeMs) === Math.round(dstStat.mtimeMs)) {
            return
        }
    }
    await fs.promises.cp(srcPath, dstPath)
    await fs.promises.utimes(dstPath, srcStat.atime, srcStat.mtime)
}

async function syncSymlink(srcPath: string, dstPath: string): Promise<void> {
    const srcTarget = await fs.promises.readlink(srcPath)
    // If dst already exists, check if it's a matching symlink
    try {
        const dstLstat = await fs.promises.lstat(dstPath)
        if (dstLstat.isSymbolicLink()) {
            const dstTarget = await fs.promises.readlink(dstPath)
            if (dstTarget === srcTarget) return // already correct
        }
        // dst exists but is wrong type or wrong target — remove it
        await fs.promises.rm(dstPath, { recursive: true, force: true })
    } catch {
        // dst doesn't exist — fine
    }
    await fs.promises.symlink(srcTarget, dstPath)
}

async function syncNodeModules(src: string, dst: string): Promise<void> {
    fs.mkdirSync(dst, { recursive: true })

    const srcPackages = new Set(fs.readdirSync(src))
    const ops: Promise<void>[] = []

    // Remove packages no longer in src
    for (const pkg of fs.readdirSync(dst)) {
        if (!srcPackages.has(pkg)) {
            fs.rmSync(path.join(dst, pkg), { recursive: true, force: true })
        }
    }

    for (const pkg of srcPackages) {
        const srcPkg = path.join(src, pkg)
        const dstPkg = path.join(dst, pkg)
        const lstat = fs.lstatSync(srcPkg)

        if (lstat.isSymbolicLink()) {
            // Preserve symlinks (common with pnpm)
            ops.push(syncSymlink(srcPkg, dstPkg))
        } else if (lstat.isDirectory()) {
            // Always recurse into directories (including .pnpm) so new packages are synced
            ops.push(syncNodeModules(srcPkg, dstPkg))
        } else {
            // Files (e.g. .package-lock.json) — sync with hash comparison
            ops.push(syncFile(srcPkg, dstPkg))
        }
    }

    await Promise.all(ops)
}

/**
 * Parse .gitignore patterns from a file, returning a list of pattern strings.
 */
function parseGitignore(gitignorePath: string): string[] {
    if (!fs.existsSync(gitignorePath)) return []
    return fs.readFileSync(gitignorePath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
}

/**
 * Check if a given entry name (or relative path) matches a gitignore pattern.
 * Supports simple glob patterns with * and **.
 */
function matchesGitignorePattern(relPath: string, pattern: string): boolean {
    // Normalize pattern (strip trailing slash for dirs)
    const normalized = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern

    // Support glob: convert gitignore-style pattern to regex
    const escapedPattern = normalized
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars except * ?
        .replace(/\*\*/g, '__DOUBLE_STAR__')
        .replace(/\*/g, '[^/]*')
        .replace(/__DOUBLE_STAR__/g, '.*')
        .replace(/\?/g, '[^/]')

    // If pattern has no slash (except trailing), match against basename too
    if (!normalized.includes('/')) {
        const basename = path.basename(relPath)
        const re = new RegExp(`^${escapedPattern}$`)
        if (re.test(basename)) return true
    }

    // Match against full relative path (anchored or anywhere)
    const reAnchored = new RegExp(`^${escapedPattern}(/.*)?$`)
    if (reAnchored.test(relPath)) return true

    // Also match any component along the path
    const parts = relPath.split('/')
    for (let i = 0; i < parts.length; i++) {
        const sub = parts.slice(i).join('/')
        if (reAnchored.test(sub)) return true
    }

    return false
}

/**
 * Returns true if the relative path should be ignored based on gitignore patterns,
 * with the following exceptions always included (never ignored):
 *  - .env
 *  - node_modules (handled separately)
 *  - README.md
 *  - .git
 */
function isGitignored(relPath: string, patterns: string[]): boolean {
    // Never ignore these
    const topLevel = relPath.split('/')[0]
    if (ALWAYS_KEEP.has(topLevel)) return false

    return patterns.some(pattern => matchesGitignorePattern(relPath, pattern))
}

/**
 * Copy src dir to dst, skipping items matched by .gitignore (with exceptions:
 * .env and node_modules are always included; README.md and .git are always excluded from copy).
 */
export async function copyDirToTmp(dir: string = findProjectRoot()): Promise<string> {
    const tmpDir = getTmpDir(dir)
    const patterns = parseGitignore(path.join(dir, '.gitignore'))
    await syncDir(dir, tmpDir, dir, patterns)
    return tmpDir
}

async function syncDir(
    src: string,
    dst: string,
    rootRef: string,
    gitignorePatterns: string[],
): Promise<void> {
    fs.mkdirSync(dst, { recursive: true })
    const ops: Promise<void>[] = []

    const srcEntries = new Set(fs.readdirSync(src))

    // Remove entries in dst that are not in src, unless they are protected
    for (const entry of fs.readdirSync(dst)) {
        const dstPath = path.join(dst, entry)
        const relPath = path.relative(rootRef, dstPath)

        if (SKIP_COPY.has(entry)) continue
        if (isGitignored(relPath, gitignorePatterns)) continue

        if (!srcEntries.has(entry)) {
            if (entry === 'node_modules') continue
            fs.rmSync(dstPath, { recursive: true, force: true })
        }
    }

    for (const entry of srcEntries) {
        const srcPath = path.join(src, entry)
        const dstPath = path.join(dst, entry)
        const relPath = path.relative(rootRef, srcPath)

        if (SKIP_COPY.has(entry)) {
            continue
        }
        if (isGitignored(relPath, gitignorePatterns)) {
            continue
        }

        const stat = fs.statSync(srcPath)
        if (entry === 'node_modules') {
            ops.push(syncNodeModules(srcPath, dstPath))
        } else if (stat.isDirectory()) {
            ops.push(syncDir(srcPath, dstPath, rootRef, gitignorePatterns))
        } else {
            ops.push(syncFile(srcPath, dstPath))
        }
    }

    await Promise.all(ops)
}

export async function copyTmpToDir(dir: string = findProjectRoot()): Promise<void> {
    const tmpDir = getTmpDir(dir)
    const patterns = parseGitignore(path.join(dir, '.gitignore'))
    await syncDir(tmpDir, dir, tmpDir, patterns)
}

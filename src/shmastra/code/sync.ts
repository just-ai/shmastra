import * as fs from 'node:fs'
import * as path from 'node:path'
import {findProjectRoot, getTmpDir} from "../files";

// Items never copied to tmp (always excluded from sync)
const SKIP_COPY = new Set(['README.md', 'AGENTS.md', 'CLAUDE.md', '.git', '.gitignore', '.claude'])

// Items never deleted from dst, and never treated as gitignored
const ALWAYS_KEEP = new Set(['.env', 'node_modules', ...SKIP_COPY])

async function syncFile(srcPath: string, dstPath: string): Promise<boolean> {
    const srcStat = await fs.promises.stat(srcPath)
    if (fs.existsSync(dstPath)) {
        const dstStat = await fs.promises.stat(dstPath)
        if (srcStat.size === dstStat.size && Math.round(srcStat.mtimeMs) === Math.round(dstStat.mtimeMs)) {
            return false
        }
    }
    await fs.promises.cp(srcPath, dstPath)
    await fs.promises.utimes(dstPath, srcStat.atime, srcStat.mtime)
    return true
}

async function syncSymlink(srcPath: string, dstPath: string): Promise<boolean> {
    const srcTarget = await fs.promises.readlink(srcPath)
    // If dst already exists, check if it's a matching symlink
    try {
        const dstLstat = await fs.promises.lstat(dstPath)
        if (dstLstat.isSymbolicLink()) {
            const dstTarget = await fs.promises.readlink(dstPath)
            if (dstTarget === srcTarget) return false // already correct
        }
        // dst exists but is wrong type or wrong target — remove it
        await fs.promises.rm(dstPath, { recursive: true, force: true })
    } catch {
        // dst doesn't exist — fine
    }
    await fs.promises.symlink(srcTarget, dstPath)
    return true
}

interface NodeModulesStats { synced: string[]; removed: number }

async function syncNodeModules(src: string, dst: string): Promise<NodeModulesStats> {
    // A stale symlink/file at dst from a previous run makes recursive mkdir fail with ENOENT
    try {
        const st = fs.lstatSync(dst)
        if (!st.isDirectory()) fs.rmSync(dst, { force: true })
    } catch {}
    fs.mkdirSync(dst, { recursive: true })

    const srcPackages = new Set(fs.readdirSync(src))
    let removed = 0

    // Remove packages no longer in src
    for (const pkg of fs.readdirSync(dst)) {
        if (!srcPackages.has(pkg)) {
            fs.rmSync(path.join(dst, pkg), { recursive: true, force: true })
            removed++
        }
    }

    const entries: Array<{ name: string; op: Promise<NodeModulesStats | boolean> }> = []
    for (const pkg of srcPackages) {
        const srcPkg = path.join(src, pkg)
        const dstPkg = path.join(dst, pkg)
        const lstat = fs.lstatSync(srcPkg)

        if (lstat.isSymbolicLink()) {
            entries.push({ name: pkg, op: syncSymlink(srcPkg, dstPkg) })
        } else if (lstat.isDirectory()) {
            entries.push({ name: pkg, op: syncNodeModules(srcPkg, dstPkg) })
        } else {
            entries.push({ name: pkg, op: syncFile(srcPkg, dstPkg) })
        }
    }

    const results = await Promise.all(entries.map(e => e.op))
    const synced: string[] = []
    for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (typeof r === 'boolean') { if (r) synced.push(path.join(src, entries[i].name)) }
        else { synced.push(...r.synced); removed += r.removed }
    }
    return { synced, removed }
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
    const normalized = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern

    const escapedPattern = normalized
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '__DOUBLE_STAR__')
        .replace(/\*/g, '[^/]*')
        .replace(/__DOUBLE_STAR__/g, '.*')
        .replace(/\?/g, '[^/]')

    if (!normalized.includes('/')) {
        const basename = path.basename(relPath)
        const re = new RegExp(`^${escapedPattern}$`)
        if (re.test(basename)) return true
    }

    const reAnchored = new RegExp(`^${escapedPattern}(/.*)?$`)
    if (reAnchored.test(relPath)) return true

    const parts = relPath.split('/')
    for (let i = 0; i < parts.length; i++) {
        const sub = parts.slice(i).join('/')
        if (reAnchored.test(sub)) return true
    }

    return false
}

function isGitignored(relPath: string, patterns: string[]): boolean {
    const topLevel = relPath.split('/')[0]
    if (ALWAYS_KEEP.has(topLevel)) return false
    return patterns.some(pattern => matchesGitignorePattern(relPath, pattern))
}

interface SyncPlan {
    dirsToCreate: string[]
    filesToCopy: Array<{ src: string; dst: string }>
    pathsToDelete: string[]
    nodeModules: Array<{ src: string; dst: string }>
}

function collectSyncOps(
    src: string,
    dst: string,
    srcRoot: string,
    dstRoot: string,
    gitignorePatterns: string[],
    plan: SyncPlan = { dirsToCreate: [], filesToCopy: [], pathsToDelete: [], nodeModules: [] },
): SyncPlan {
    plan.dirsToCreate.push(dst)

    const srcEntries = new Set(fs.existsSync(src) ? fs.readdirSync(src) : [])

    if (fs.existsSync(dst)) {
        for (const entry of fs.readdirSync(dst)) {
            const dstPath = path.join(dst, entry)
            const relPath = path.relative(dstRoot, dstPath)

            if (SKIP_COPY.has(entry)) continue
            if (isGitignored(relPath, gitignorePatterns)) continue
            if (entry === 'node_modules') continue

            if (!srcEntries.has(entry)) {
                plan.pathsToDelete.push(dstPath)
            }
        }
    }

    for (const entry of srcEntries) {
        const srcPath = path.join(src, entry)
        const dstPath = path.join(dst, entry)
        const relPath = path.relative(srcRoot, srcPath)

        if (SKIP_COPY.has(entry)) continue
        if (isGitignored(relPath, gitignorePatterns)) continue

        const stat = fs.statSync(srcPath)
        if (entry === 'node_modules') {
            plan.nodeModules.push({ src: srcPath, dst: dstPath })
        } else if (stat.isDirectory()) {
            collectSyncOps(srcPath, dstPath, srcRoot, dstRoot, gitignorePatterns, plan)
        } else {
            plan.filesToCopy.push({ src: srcPath, dst: dstPath })
        }
    }

    return plan
}

function logSyncResults(copied: string[], deletes: string[], nm: NodeModulesStats): void {
    if (copied.length + deletes.length + nm.synced.length + nm.removed === 0) return
    const parts = [`${copied.length} files copied`, `${deletes.length} deleted`]
    if (nm.synced.length + nm.removed > 0) parts.push(`${nm.synced.length} packages synced, ${nm.removed} removed`)
    console.log(`[sync] ${parts.join(', ')}`)
}

async function executeSyncPlan(plan: SyncPlan, fresh = false): Promise<void> {
    if (fresh) {
        console.log(`[sync] creating working copy (${plan.filesToCopy.length} files)`)
    }
    // 1. Sync node_modules first (largest)
    const nmResults = await Promise.all(plan.nodeModules.map(({ src, dst }) => syncNodeModules(src, dst)))
    const nmStats: NodeModulesStats = { synced: [], removed: 0 }
    for (const r of nmResults) { nmStats.synced.push(...r.synced); nmStats.removed += r.removed }

    // 2. Create directories & delete stale paths
    for (const dir of plan.dirsToCreate) {
        fs.mkdirSync(dir, { recursive: true })
    }
    await Promise.all(plan.pathsToDelete.map(p => fs.promises.rm(p, { recursive: true, force: true })))

    // 3. Copy files
    const results = await Promise.all(plan.filesToCopy.map(async ({ src, dst }) => {
        const copied = await syncFile(src, dst)
        return copied ? dst : null
    }))
    const copied = results.filter((p): p is string => p !== null)

    if (!fresh) logSyncResults(copied, plan.pathsToDelete, nmStats)
}

export async function copyDirToTmp(dir: string = findProjectRoot()): Promise<string> {
    const tmpDir = getTmpDir(dir)
    const fresh = !fs.existsSync(tmpDir) || fs.readdirSync(tmpDir).length === 0
    const patterns = parseGitignore(path.join(dir, '.gitignore'))
    const plan = collectSyncOps(dir, tmpDir, dir, tmpDir, patterns)
    await executeSyncPlan(plan, fresh)
    return tmpDir
}

export async function copyTmpToDir(dir: string = findProjectRoot()): Promise<void> {
    const tmpDir = getTmpDir(dir)
    const patterns = parseGitignore(path.join(dir, '.gitignore'))
    const plan = collectSyncOps(tmpDir, dir, tmpDir, dir, patterns)
    await executeSyncPlan(plan)
}
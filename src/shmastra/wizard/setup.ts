import * as readline from 'readline'
import { c, styled } from './colors'
import { parseEnv, writeEnvKeys } from '../env'
import { PROVIDERS, type Provider } from './providers'
import { selectOAuthLogin, selectProvider, promptApiKey, promptComposioKey } from './ui'
import { createAuthStorage, type createMastraCode } from 'mastracode'

type AuthStorage = Awaited<ReturnType<typeof createMastraCode>>['authStorage']

let _authStorage: AuthStorage | undefined

/** Get or create the shared AuthStorage instance (backed by auth.json) */
export function getAuthStorage(): AuthStorage {
    if (!_authStorage) {
        _authStorage = createAuthStorage()
    }
    return _authStorage
}

export async function ensureApiKey(): Promise<void> {
    const dotEnv = parseEnv()
    const authStorage = getAuthStorage()

    const hasApiKey = PROVIDERS.some(p =>
        (process.env[p.key]?.length ?? 0) > 0 || (dotEnv[p.key]?.length ?? 0) > 0
    )

    if (hasApiKey) return

    // Collect all keys in memory first, write to .env once at the end
    // to avoid triggering file-watcher restarts mid-wizard.
    const pending: Array<{ key: string; value: string }> = []
    const saved: string[] = []

    // ── Phase 0: OAuth account login (optional) ──────────────────────────
    const oauthProviders = PROVIDERS.filter(p => p.oauthId && !authStorage.isLoggedIn(p.oauthId))
    if (oauthProviders.length > 0) {
        console.log(styled('  ◆  Login with your AI provider account', c.magenta, c.bold))
        console.log(styled('     Use your Pro/Max subscription for code generation', c.dim))
        console.log()

        const loggedIn: string[] = []

        while (true) {
            const remaining = oauthProviders.filter(p => !loggedIn.includes(p.oauthId!))
            if (remaining.length === 0) break

            const result = await selectOAuthLogin(remaining)
            if (result === null || result.type === 'skip') break

            console.log()
            const ok = await performOAuthLogin(result.provider, authStorage)
            if (ok) loggedIn.push(result.provider.oauthId!)
        }

        process.stdout.write('\x1b[2J\x1b[H')
        for (const id of loggedIn) {
            const p = PROVIDERS.find(p => p.oauthId === id)
            if (p) console.log(styled(`  ✓ ${p.name} account`, c.green, c.bold))
        }
        if (loggedIn.length > 0) console.log()
    }

    // ── Phase 1: require first provider API key ──────────────────────────
    console.log(styled('  ⚠  An API key is needed for agents to use LLM models', c.yellow, c.bold))
    console.log(styled('  Please select a provider to configure:', c.dim))
    console.log()

    while (saved.length === 0) {
        const remaining = PROVIDERS.filter(p => !saved.includes(p.key))
        const idx = await selectProvider(remaining, false)

        if (idx === null) {
            console.log(styled('\n  Exiting. Please add an API key to .env manually.\n', c.red))
            process.exit(0)
        }

        const provider = remaining[idx]
        console.log()
        const apiKey = await promptApiKey(provider)

        if (!apiKey) {
            console.log(styled('\n  No key entered. Try again.\n', c.yellow))
            continue
        }

        pending.push({ key: provider.key, value: apiKey })
        process.env[provider.key] = apiKey
        saved.push(provider.key)
    }

    // ── Phase 2: optionally add more providers ───────────────────────────
    while (true) {
        const remaining = PROVIDERS.filter(p => !saved.includes(p.key))
        if (remaining.length === 0) break

        process.stdout.write('\x1b[2J\x1b[H')
        for (const key of saved) {
            console.log(styled(`  ✓ ${key}`, c.green, c.bold))
        }
        console.log()
        console.log(styled('  Add more provider keys, or continue:', c.dim))
        console.log()

        const idx = await selectProvider(remaining, true)
        if (idx === null) break

        const provider = remaining[idx]
        console.log()
        const apiKey = await promptApiKey(provider)

        if (!apiKey) {
            console.log(styled('\n  No key entered. Try again.\n', c.yellow))
            continue
        }

        pending.push({ key: provider.key, value: apiKey })
        process.env[provider.key] = apiKey
        saved.push(provider.key)
    }

    process.stdout.write('\x1b[2J\x1b[H')
    for (const key of saved) {
        console.log(styled(`  ✓ ${key}`, c.green, c.bold))
    }
    console.log()

    // ── Phase 3: optional Composio key ───────────────────────────────────
    const composioKey = 'COMPOSIO_API_KEY'
    const apiKey = await promptComposioKey()
    if (apiKey) {
        pending.push({ key: composioKey, value: apiKey })
        process.env[composioKey] = apiKey
        console.log(styled(`  ✓ ${composioKey}`, c.green, c.bold))
    } else {
        console.log(styled('  Skipping Composio. Add COMPOSIO_API_KEY to .env later.\n', c.dim))
    }
    console.log()

    // ── Flush all collected keys to .env in a single write ─────────────────
    writeEnvKeys(pending)
}

async function performOAuthLogin(provider: Provider, authStorage: AuthStorage): Promise<boolean> {
    console.log(styled(`  Logging in with ${provider.name} account...`, provider.color, c.bold))
    console.log()

    try {
        await authStorage.login(provider.oauthId!, {
            onAuth: (info) => {
                console.log(styled('  Open this URL in your browser:', c.dim))
                console.log(styled(`  ${info.url}`, c.cyan, c.bold))
                if (info.instructions) {
                    console.log(styled(`  ${info.instructions}`, c.dim))
                }
                console.log()
            },
            onPrompt: async (prompt) => {
                return new Promise((resolve) => {
                    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false })
                    const question =
                        styled(`  ${prompt.message}`, provider.color, c.bold) + '\n  ' +
                        styled('› ', c.cyan, c.bold)
                    rl.question(question, (answer: string) => {
                        rl.close()
                        process.stdin.resume()
                        resolve(answer.trim())
                    })
                })
            },
            onProgress: (message) => {
                console.log(styled(`  ${message}`, c.dim))
            },
        })

        console.log(styled(`  ✓ Logged in with ${provider.name} account`, c.green, c.bold))
        console.log()
        return true
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(styled(`  ✕ Login failed: ${msg}`, c.red))
        console.log()
        return false
    }
}

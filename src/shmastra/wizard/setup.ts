import { c, styled } from './colors'
import { parseEnv, writeEnvKeys } from '../env'
import { PROVIDERS } from './providers'
import { selectProvider, promptApiKey, promptComposioKey } from './ui'

export async function ensureApiKey(): Promise<void> {
    const dotEnv = parseEnv()

    const configured = PROVIDERS.filter(p =>
        (process.env[p.key]?.length ?? 0) > 0 || (dotEnv[p.key]?.length ?? 0) > 0
    )

    // Collect all keys in memory first, write to .env once at the end
    // to avoid triggering file-watcher restarts mid-wizard.
    const pending: Array<{ key: string; value: string }> = []

    if (!configured.length) {
        const saved: string[] = []

        // ── Phase 1: require first provider key ──────────────────────────────
        console.log(styled('  ⚠  No LLM provider API key detected in process env or .env', c.yellow, c.bold))
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
    }

    // ── Flush all collected keys to .env in a single write ─────────────────
    writeEnvKeys(pending)
}

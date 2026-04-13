import * as readline from 'readline'
import { c, styled } from './colors'
import { type Provider } from './providers'


// ── Generic arrow-key menu ───────────────────────────────────────────────────
interface MenuItem {
    label: string
    hint?: string
    color: string
    bgColor?: string
}

function printMenu(items: MenuItem[], selected: number) {
    process.stdout.write('\x1b[?25l') // hide cursor
    items.forEach((item, i) => {
        const isSel = i === selected
        const prefix = isSel ? styled(' ❯ ', item.color, c.bold) : '   '
        const label = isSel
            ? styled(` ${item.label} `, c.white, c.bold, item.bgColor ?? c.bgBlue)
            : styled(` ${item.label}`, item.color)
        const hint = item.hint ? styled(`  ${item.hint}`, c.dim) : ''
        console.log(prefix + label + hint)
    })
    console.log()
    console.log(styled('  ↑/↓ navigate  •  Enter select  •  q quit', c.dim))
    console.log()
}

function selectMenu(items: MenuItem[]): Promise<number | null> {
    return new Promise(resolve => {
        let selected = 0
        const total = items.length
        const rows = total + 3 // items + blank + hint + blank

        function render(first = false) {
            if (!first) process.stdout.write(`\x1b[${rows}A`)
            printMenu(items, selected)
        }

        render(true)

        readline.emitKeypressEvents(process.stdin)
        if (process.stdin.isTTY) process.stdin.setRawMode(true)

        function onKey(_: string, key: readline.Key) {
            if (!key) return
            if (key.name === 'up') {
                selected = (selected - 1 + total) % total; render()
            } else if (key.name === 'down') {
                selected = (selected + 1) % total; render()
            } else if (key.name === 'return') {
                cleanup()
                resolve(selected)
            } else if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
                cleanup()
                resolve(null)
            }
        }

        function cleanup() {
            process.stdin.removeListener('keypress', onKey)
            if (process.stdin.isTTY) process.stdin.setRawMode(false)
            process.stdout.write('\x1b[?25h')
        }

        process.stdin.on('keypress', onKey)
    })
}


// ── OAuth login menu ─────────────────────────────────────────────────────────
export type OAuthMenuResult =
    | { type: 'login'; provider: Provider }
    | { type: 'skip' }
    | null

export async function selectOAuthLogin(oauthProviders: Provider[]): Promise<OAuthMenuResult> {
    const items: MenuItem[] = [
        ...oauthProviders.map(p => ({
            label: `Login with ${p.name} account`,
            color: c.magenta,
            bgColor: c.bgCyan,
        })),
        { label: 'Skip →', color: c.green, bgColor: c.bgGreen },
    ]

    const idx = await selectMenu(items)
    if (idx === null) return null
    if (idx < oauthProviders.length) return { type: 'login', provider: oauthProviders[idx] }
    return { type: 'skip' }
}


// ── Provider menu (API keys) ─────────────────────────────────────────────────
export function selectProvider(providers: Provider[], showContinue = false): Promise<number | null> {
    const items: MenuItem[] = []

    if (showContinue) {
        items.push({ label: '✓  Continue', color: c.green, bgColor: c.bgGreen })
    }

    providers.forEach(p => {
        items.push({ label: p.name, hint: `(${p.key})`, color: c.cyan })
    })

    items.push({ label: '✕  Cancel / exit', color: c.red })

    return new Promise(resolve => {
        selectMenu(items).then(idx => {
            if (idx === null) {
                resolve(null)
                return
            }
            const offset = showContinue ? 1 : 0
            const cancelIdx = providers.length + offset
            if (idx === cancelIdx) {
                resolve(null)
            } else if (showContinue && idx === 0) {
                resolve(null) // Continue = done
            } else {
                resolve(idx - offset)
            }
        })
    })
}


// ── Composio prompt ───────────────────────────────────────────────────────────
export async function promptComposioKey(): Promise<string | null> {
    return new Promise(resolve => {
        console.log(styled('  ◆  Composio', c.cyan, c.bold) + styled(' — connect agents to 250+ tools: GitHub, Gmail, Slack, Notion, Linear & more', c.dim))
        console.log(styled('     Get your free key at ', c.dim) + styled('https://app.composio.dev/settings', c.cyan))
        console.log()
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false })
        const question =
            styled('  Paste your Composio API key', c.cyan, c.bold) +
            styled(' (Enter to skip):\n  ', c.dim) +
            styled('› ', c.cyan, c.bold)
        rl.question(question, answer => {
            rl.close()
            process.stdin.resume()
            resolve(answer.trim() || null)
        })
        rl.on('SIGINT', () => { rl.close(); process.stdin.resume(); resolve(null) })
    })
}


// ── API key prompt ────────────────────────────────────────────────────────────
export async function promptApiKey(provider: Provider): Promise<string | null> {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false })
        const question =
            styled(`  Paste your ${provider.name} API key`, provider.color, c.bold) +
            styled(' (Ctrl+C to cancel):\n  ', c.dim) +
            styled('› ', c.cyan, c.bold)
        rl.question(question, answer => {
            rl.close()
            process.stdin.resume()
            resolve(answer.trim() || null)
        })
        rl.on('SIGINT', () => { rl.close(); process.stdin.resume(); resolve(null) })
    })
}

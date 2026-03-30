import * as readline from 'readline'
import { c, styled } from './colors'
import { type Provider } from './providers'


// ── Provider menu ─────────────────────────────────────────────────────────────
function printProviderMenu(providers: Provider[], selected: number, showContinue: boolean) {
    process.stdout.write('\x1b[?25l') // hide cursor
    // Continue row (first, only when applicable)
    if (showContinue) {
        const isSel = selected === 0
        const prefix = isSel ? styled(' ❯ ', c.green, c.bold) : '   '
        const label  = isSel
            ? styled(' ✓  Continue ', c.white, c.bold, c.bgGreen)
            : styled(' ✓  Continue', c.green, c.bold)
        console.log(prefix + label)
    }
    const offset = showContinue ? 1 : 0
    providers.forEach((p, i) => {
        const isSelected = i + offset === selected
        const prefix = isSelected ? styled(' ❯ ', c.cyan, c.bold) : '   '
        const label  = isSelected
            ? styled(` ${p.name} `, c.white, c.bold, c.bgBlue)
            : styled(` ${p.name}`, c.white)
        console.log(prefix + label + styled(`  (${p.key})`, c.dim))
    })
    const cancelIdx = providers.length + offset
    const isCancelSel = selected === cancelIdx
    const cancelPrefix = isCancelSel ? styled(' ❯ ', c.red, c.bold) : '   '
    console.log(cancelPrefix + styled(' ✕  Cancel / exit', isCancelSel ? c.red : c.dim))
    console.log()
    console.log(styled('  ↑/↓ navigate  •  Enter select  •  q quit', c.dim))
    console.log()
}

export function selectProvider(providers: Provider[], showContinue = false): Promise<number | null> {
    return new Promise(resolve => {
        const offset = showContinue ? 1 : 0
        let selected = 0
        const total  = providers.length + offset + 1 // +1 for cancel row

        function render(first = false) {
            if (!first) process.stdout.write(`\x1b[${total + 3}A`)
            printProviderMenu(providers, selected, showContinue)
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
                const cancelIdx = providers.length + offset
                if (selected === cancelIdx) {
                    resolve(null)
                } else if (showContinue && selected === 0) {
                    resolve(null) // Continue = done
                } else {
                    resolve(selected - offset)
                }
            } else if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
                cleanup()
                resolve(null)
            }
        }

        function cleanup() {
            process.stdin.removeListener('keypress', onKey)
            if (process.stdin.isTTY) process.stdin.setRawMode(false)
            process.stdout.write('\x1b[?25h') // show cursor
        }

        process.stdin.on('keypress', onKey)
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

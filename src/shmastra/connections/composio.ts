import { Composio } from "@composio/core";
import { MastraProvider } from "@composio/mastra";
let composio: Composio<MastraProvider> | null = null;
let initialized = false;

function init(): void {
    if (initialized) return;
    initialized = true;
    if (!process.env.COMPOSIO_API_KEY) {
        const lines = [
            '  ◆  Composio is not configured',
            '  Connect agents to 250+ tools: GitHub, Gmail, Slack, Notion, Linear & more.',
            '  Add COMPOSIO_API_KEY to .env  →  https://app.composio.dev/settings',
        ]
        const width = Math.max(...lines.map(l => l.length)) + 2
        const box = [
            '┌' + '─'.repeat(width) + '┐',
            ...lines.map(l => '│ ' + l + ' '.repeat(width - l.length - 1) + '│'),
            '└' + '─'.repeat(width) + '┘',
        ].join('\n')
        console.log()
        console.log(box)
        console.log()
        return;
    }
    try {
        composio = new Composio({ provider: new MastraProvider() });
    } catch (error) {
        console.error("Composio cannot be configured", error);
    }
}

export function isConnected(): boolean {
    init();
    return !!composio;
}

export function requireComposio(): Composio<MastraProvider> {
    init();
    if (!composio) throw new Error("Composio is not configured");
    return composio;
}

import { c } from './colors'

export interface Provider {
    name:  string
    key:   string
    color: string
    /** OAuth provider ID in mastracode's auth registry (if login is supported) */
    oauthId?: string
}

export const PROVIDERS: Provider[] = [
    { name: 'OpenAI',       key: 'OPENAI_API_KEY',                   color: c.green,   oauthId: 'openai-codex' },
    { name: 'Anthropic',    key: 'ANTHROPIC_API_KEY',                color: c.magenta, oauthId: 'anthropic'    },
    { name: 'Google AI',    key: 'GOOGLE_GENERATIVE_AI_API_KEY',     color: c.blue    },
]

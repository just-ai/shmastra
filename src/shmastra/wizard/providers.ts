import { c } from './colors'

export interface Provider {
    name:  string
    key:   string
    color: string
}

export const PROVIDERS: Provider[] = [
    { name: 'OpenAI',       key: 'OPENAI_API_KEY',                   color: c.green   },
    { name: 'Anthropic',    key: 'ANTHROPIC_API_KEY',                color: c.magenta },
    { name: 'Google AI',    key: 'GOOGLE_GENERATIVE_AI_API_KEY',     color: c.blue    },
]

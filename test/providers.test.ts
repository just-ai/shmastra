import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const MOCK_REGISTRY = {
    openai: {
        apiKeyEnvVar: 'OPENAI_API_KEY',
        models: ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano'],
    },
    google: {
        apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
        models: [
            'gemini-3-pro-preview',
            'gemini-3-flash-preview',
            'gemini-3.1-flash-lite-preview',
        ],
    },
    anthropic: {
        apiKeyEnvVar: 'ANTHROPIC_API_KEY',
        models: ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-6'],
    },
    needsTwo: {
        apiKeyEnvVar: ['TOKEN_A', 'TOKEN_B'],
        models: ['model-dual'],
    },
}

async function loadProviders(env: Record<string, string | undefined>) {
    vi.resetModules()
    vi.doMock('@mastra/core/llm', () => ({ PROVIDER_REGISTRY: MOCK_REGISTRY }))
    for (const k of Object.keys(MOCK_REGISTRY).flatMap(id => {
        const v = (MOCK_REGISTRY as any)[id].apiKeyEnvVar
        return Array.isArray(v) ? v : [v]
    })) {
        vi.stubEnv(k, env[k] as string | undefined as any)
    }
    return import('../src/shmastra/providers')
}

beforeEach(() => {
    vi.resetModules()
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('@mastra/core/llm')
})

describe('findAvailableModel', () => {
    it('returns the first model whose provider has its API key set', async () => {
        const { findAvailableModel } = await loadProviders({ OPENAI_API_KEY: 'x' })
        expect(
            findAvailableModel(['anthropic/claude-sonnet-4-6', 'openai/gpt-5.4']),
        ).toBe('openai/gpt-5.4')
    })

    it('returns undefined when no provider has its key', async () => {
        const { findAvailableModel } = await loadProviders({})
        expect(findAvailableModel(['openai/gpt-5.4'])).toBeUndefined()
    })

    it('requires ALL env vars to be set for multi-key providers', async () => {
        const { findAvailableModel: onlyA } = await loadProviders({ TOKEN_A: 'a' })
        expect(onlyA(['needsTwo/model-dual'])).toBeUndefined()

        const { findAvailableModel: both } = await loadProviders({
            TOKEN_A: 'a',
            TOKEN_B: 'b',
        })
        expect(both(['needsTwo/model-dual'])).toBe('needsTwo/model-dual')
    })
})

describe('getAvailableModel', () => {
    it('falls back to the default model when nothing is available', async () => {
        const { getAvailableModel } = await loadProviders({})
        expect(getAvailableModel(['openai/gpt-5.4'])).toBe('openai/gpt-5.4')
    })

    it('falls back to the first model in the list by default', async () => {
        const { getAvailableModel } = await loadProviders({})
        expect(getAvailableModel(['openai/a', 'google/b'])).toBe('openai/a')
    })

    it('returns an explicit defaultModel when given', async () => {
        const { getAvailableModel } = await loadProviders({})
        expect(getAvailableModel(['openai/a'], 'fallback/model')).toBe('fallback/model')
    })

    it('prefers an available model over the default', async () => {
        const { getAvailableModel } = await loadProviders({ GOOGLE_GENERATIVE_AI_API_KEY: 'g' })
        expect(getAvailableModel(['google/gemini-3-pro-preview'], 'x/y')).toBe(
            'google/gemini-3-pro-preview',
        )
    })
})

describe('getAgentModel', () => {
    it('resolves the "fast" tier to a model whose provider is available', async () => {
        const { getAgentModel } = await loadProviders({ OPENAI_API_KEY: 'x' })
        expect(getAgentModel('fast')).toEqual([{ model: 'openai/gpt-5.4-nano', maxRetries: 1 }])
    })

    it('resolves the "general" tier', async () => {
        const { getAgentModel } = await loadProviders({ ANTHROPIC_API_KEY: 'x' })
        expect(getAgentModel('general')).toEqual([{ model: 'anthropic/claude-sonnet-4-6', maxRetries: 1 }])
    })

    it('resolves the "best" tier', async () => {
        const { getAgentModel } = await loadProviders({ GOOGLE_GENERATIVE_AI_API_KEY: 'g' })
        expect(getAgentModel('best')).toEqual([{ model: 'google/gemini-3-pro-preview', maxRetries: 1 }])
    })
})

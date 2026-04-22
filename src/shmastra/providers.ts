import {PROVIDER_REGISTRY} from "@mastra/core/llm";

const AVAILABLE_MODELS = Object.entries(PROVIDER_REGISTRY).flatMap(([id, provider]) => {
    const envVars = Array.isArray(provider.apiKeyEnvVar) ? provider.apiKeyEnvVar : [provider.apiKeyEnvVar];
    if (!envVars.every(v => !!process.env[v])) return [];
    return provider.models.map(model => `${id}/${model}`);
})

export const AGENT_MODELS = {
    fast: ['openai/gpt-5.4-nano', 'google/gemini-3.1-flash-lite-preview', 'anthropic/claude-sonnet-4-6'],
    general: ['openai/gpt-5.4-mini', 'google/gemini-3-flash-preview', 'anthropic/claude-sonnet-4-6'],
    best: ['openai/gpt-5.4', 'google/gemini-3-pro-preview', 'anthropic/claude-opus-4-7'],
}

export const OBSERVER_MODELS = [
    'google/gemini-3-flash-preview',
    'openai/gpt-5.4-mini',
    'anthropic/claude-sonnet-4-6'
]

export const DEVELOPER_MODELS = [
    'openai/gpt-5.4',
    'anthropic/claude-opus-4-7',
    'google/gemini-3.1-pro-preview',
]

export const findAvailableModel = (models: string[]) =>
    models.find(m => AVAILABLE_MODELS.includes(m));

export const getAvailableModel = (models: string[], defaultModel = models[0]) =>
    findAvailableModel(models) || defaultModel;

export const getAvailableModels = (models: string[]) => {
    const available = models.filter(m => AVAILABLE_MODELS.includes(m));
    return available.length ? available : [models[0]];
};

export const getAgentModel = (key: keyof typeof AGENT_MODELS) =>
    getAvailableModels(AGENT_MODELS[key]).map(model => ({model, maxRetries: 1}))


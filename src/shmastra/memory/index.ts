import {Memory} from "@mastra/memory";
import {getAvailableModels, OBSERVER_MODELS} from "../providers";

/**
 * Creates memory for agent.
 * Use this function for every agent you create.
 */
export const createAgentMemory = () =>
    new Memory({
        options: {
            observationalMemory: {
                model: getAvailableModels(OBSERVER_MODELS).map(model => ({model, maxRetries: 1})),
            }
        }
    });
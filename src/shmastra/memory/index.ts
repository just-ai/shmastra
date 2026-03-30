import {Memory} from "@mastra/memory";
import {getAvailableModel, OBSERVER_MODELS} from "../providers";

/**
 * Creates memory for agent.
 * Use this function for every agent you create.
 */
export const createAgentMemory = () =>
    new Memory({
        options: {
            observationalMemory: {
                model: getAvailableModel(OBSERVER_MODELS),
            }
        }
    });
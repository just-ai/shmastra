import {AgentStepOptions, createStep} from "@mastra/core/workflows";
import {Agent} from "@mastra/core/agent";
import {randomUUID} from "crypto";

export const createAgentStep = (agent: Agent<any>, options?: Omit<AgentStepOptions<any>, 'structuredOutput'> & { structuredOutput?: never }) =>
    createStep(agent, {
        ...options,
        memory: {
            thread: randomUUID(),
            resource: randomUUID(),
            options: {
                observationalMemory: false,
            }
        }
    });
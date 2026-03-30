import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type {ToolsInput} from "@mastra/core/agent";
import type {DynamicArgument} from "@mastra/core/types";
import {createGoogleGenerativeAI} from "@ai-sdk/google";

export const createWebSearchTool = (agentId: string): DynamicArgument<ToolsInput> =>
    async ({ requestContext, mastra }): Promise<ToolsInput> => {
        const model = await mastra?.getAgentById(agentId!)?.getModel();
        if (model?.provider === "openai") {
            return { web_search: createOpenAI().tools.webSearch() };
        }
        if (model?.provider === "anthropic") {
            return { web_search: createAnthropic().tools.webSearch_20250305() };
        }
        if (model?.provider === "google") {
            return { web_search: createGoogleGenerativeAI().tools.googleSearch({}) };
        }
        return {};
    };

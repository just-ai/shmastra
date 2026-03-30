import type {ToolsInput} from "@mastra/core/agent";
import type {DynamicArgument} from "@mastra/core/types";

type AgentToolsInput = Record<string, ToolsInput[string] | DynamicArgument<ToolsInput>>;

export const createAgentTools = (
    tools: AgentToolsInput,
): DynamicArgument<ToolsInput> => async (context): Promise<ToolsInput> => {
    const entries = await Promise.all(
        Object.entries(tools).map(async ([key, entry]) => {
            if (typeof entry === 'function') {
                const resolved = await entry(context);
                return Object.entries(resolved ?? {});
            }
            return [[key, entry]] as [string, ToolsInput][];
        })
    );
    return Object.fromEntries(entries.flat());
};

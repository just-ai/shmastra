import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {mastraClient} from "../client";

export const getAgentThreadMessagesTool = createTool({
    id: "get_agent_thread_messages",
    description: "Get messages of an agent memory thread by thread ID to analyse conversation history",
    inputSchema: z.object({
        agentId: z.string().describe("The agent ID"),
        threadId: z.string().describe("The thread ID"),
    }),
    execute: async (input) => {
        return (await mastraClient()).listThreadMessages(input.threadId, {agentId: input.agentId});
    }
});

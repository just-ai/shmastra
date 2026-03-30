import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {mastraClient} from "../client";

export const getAgentDetailsTool = createTool({
    id: "get_agent_details",
    description: "Get full details of a Mastra agent by id, including instructions, tools, and workflows",
    inputSchema: z.object({
        agentId: z.string().describe("The agent ID"),
    }),
    execute: async (input) => {
        return (await mastraClient()).getAgent(input.agentId).details();
    }
});

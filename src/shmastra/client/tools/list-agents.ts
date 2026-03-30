import {createTool} from "@mastra/core/tools";
import {mastraClient} from "../client";

export const listAgentsTool = createTool({
    id: "list_agents",
    description: "Get list of all available Mastra agents with brief details (id, name, description, model)",
    execute: async () => {
        const agents = await (await mastraClient()).listAgents();
        return Object.entries(agents).map(([id, agent]) => ({
            id,
            name: agent.name,
            description: agent.description,
            provider: agent.provider,
            modelId: agent.modelId,
        }));
    }
});

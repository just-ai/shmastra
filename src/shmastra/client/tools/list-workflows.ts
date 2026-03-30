import {createTool} from "@mastra/core/tools";
import {mastraClient} from "../client";

export const listWorkflowsTool = createTool({
    id: "list_workflows",
    description: "Get list of all available Mastra workflows with brief details (name, description)",
    execute: async () => {
        const workflows = await (await mastraClient()).listWorkflows();
        return Object.entries(workflows).map(([id, workflow]) => ({
            id,
            name: workflow.name,
            description: workflow.description,
        }));
    }
});

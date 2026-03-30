import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {mastraClient} from "../client";

export const getWorkflowDetailsTool = createTool({
    id: "get_workflow_details",
    description: "Get full details of a Mastra workflow by id, including steps and input/output schemas",
    inputSchema: z.object({
        workflowId: z.string().describe("The workflow ID"),
    }),
    execute: async (input) => {
        const workflow = (await mastraClient()).getWorkflow(input.workflowId);
        const [details, schema] = await Promise.all([
            workflow.details(),
            workflow.getSchema(),
        ]);
        return {...details, inputSchema: schema.inputSchema, outputSchema: schema.outputSchema};
    }
});

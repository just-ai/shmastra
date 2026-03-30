import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {mastraClient} from "../client";

export const getWorkflowRunDetailsTool = createTool({
    id: "get_workflow_run_details",
    description: "Get details of a specific workflow run by run ID, including step logs and status",
    inputSchema: z.object({
        workflowId: z.string().describe("The workflow ID"),
        runId: z.string().describe("The workflow run ID"),
    }),
    execute: async (input) => {
        return (await mastraClient()).getWorkflow(input.workflowId).runById(input.runId);
    }
});

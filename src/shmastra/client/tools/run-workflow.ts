import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {mastraClient} from "../client";

export const runWorkflowTool = createTool({
    id: "run_workflow",
    description: "Run a Mastra workflow with input data and wait for the result. Use get_workflow_details to get the input schema first.",
    inputSchema: z.object({
        workflowId: z.string().describe("The workflow ID"),
        inputData: z.record(z.string(), z.any()).describe("Input data matching the workflow's input schema"),
    }),
    execute: async (input) => {
        const workflow = (await mastraClient()).getWorkflow(input.workflowId);
        const run = await workflow.createRun();
        return run.startAsync({
            inputData: input.inputData,
        });
    }
});

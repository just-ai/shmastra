import {createTool} from "@mastra/core/tools";
import {ShmastraProvider} from "../types";
import {getWorkdir} from "../../files";
import {dryRun, DryRunTimeoutError} from "../../../../scripts/dry-run";
import {z} from "zod";

export const createApplyChangesTool = (provider: ShmastraProvider) =>
    createTool({
        id: "apply_changes",
        description: "Apply your changes. If you need to be notified once Mastra server was restarted with your changes - set notify param to true.",
        inputSchema: z.object({
           notify: z.boolean().describe("Notify you once changes were applied actually and Mastra server was restarted")
        }),
        execute: async (inputData) => {
            try {
                await dryRun(getWorkdir(), { silent: true });
                const version = provider.harness.applyChanges();
                return {
                    version,
                    success: true,
                    instructions: `Finish conversation. Changes will be applied after your last message in this turn. ${inputData.notify ? "You will receive automatic message once changes are actually applied." : ""}`,
                };
            } catch (e) {
                if (e instanceof DryRunTimeoutError) {
                    return { success: false, error: `[TIMEOUT] ${e.message}\n${e.output}` };
                }
                return { success: false, error: e };
            }
        }
    });
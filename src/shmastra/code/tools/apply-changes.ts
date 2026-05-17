import {createTool} from "@mastra/core/tools";
import {ShmastraProvider} from "../types";
import {getWorkdir} from "../../files";
import {diffWorkdirAndProject} from "../sync";
import {dryRun, DryRunTimeoutError} from "../../../../scripts/dry-run";
import {z} from "zod";

const APPS_PREFIX = "src/mastra/public/apps/";

export const createApplyChangesTool = (provider: ShmastraProvider) =>
    createTool({
        id: "apply_changes",
        description: "Apply your changes. If you need to be notified once Mastra server was restarted with your changes - set notify param to true.",
        inputSchema: z.object({
            notify: z.boolean().describe("Notify you once changes were applied actually and Mastra server was restarted"),
        }),
        execute: async (inputData) => {
            try {
                const changed = diffWorkdirAndProject();
                const bundled = !changed.length || changed.some(f => !f.startsWith(APPS_PREFIX));
                if (bundled) {
                    await dryRun(getWorkdir(), { silent: true });
                }
                const version = provider.harness.applyChanges();
                return {
                    version,
                    bundled,
                    changed,
                    success: true,
                    instructions: bundled
                        ? `Finish conversation. Changes will be applied after your last message in this turn. ${inputData.notify ? "You will receive automatic message once changes are actually applied." : ""}`
                        : "Changes applied successfully. Server will not be restarted — all changes are already in effect.",
                };
            } catch (e) {
                if (e instanceof DryRunTimeoutError) {
                    return { success: false, error: `[TIMEOUT] ${e.message}\n${e.output}` };
                }
                return { success: false, error: e };
            }
        }
    });

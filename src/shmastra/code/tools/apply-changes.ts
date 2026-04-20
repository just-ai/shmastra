import {createTool} from "@mastra/core/tools";
import {ShmastraProvider} from "../types";
import {getWorkdir} from "../../files";
import {dryRun, DryRunTimeoutError} from "../../../../scripts/dry-run";

export const createApplyChangesTool = (provider: ShmastraProvider) =>
    createTool({
        id: "apply_changes",
        description: "Apply your changes",
        execute: async () => {
            try {
                await dryRun(getWorkdir(), { silent: true });
                provider.harness.applyChanges();
            } catch (e) {
                if (e instanceof DryRunTimeoutError) {
                    return { success: false, error: `[TIMEOUT] ${e.message}\n${e.output}` };
                }
                return { success: false, error: e };
            }
            return { success: true };
        }
    });
import {Workflow} from "@mastra/core/workflows";

/**
 * A registry of Mastra workflows indexed by their unique identifier.
 * IMPORTANT: Do not touch index.ts in `src/mastra` - all workflows from this file are automatically injected already
 */
export const workflows: Record<string, Workflow> = {
}

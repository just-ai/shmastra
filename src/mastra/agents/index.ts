import { Agent } from "@mastra/core/agent";

/**
 * A registry of Mastra agents indexed by their unique identifier.
 * IMPORTANT: Do not touch index.ts in `src/mastra` - all agents from this file are automatically injected already
 */
import { testAgent } from "./test-agent";

export const agents: Record<string, Agent> = {
  testAgent,
};

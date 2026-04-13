import {AgentBrowser} from "@mastra/agent-browser";

export const createAgentBrowser = () =>
    new AgentBrowser({
        headless: true,
    });
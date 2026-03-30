import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {searchMcpServers} from "./registry";

export const searchMcpServersTool = createTool({
    id: "search_mcp_servers",
    description: "Search MCP servers using keywords",
    inputSchema: z.object({
        keywords: z.array(z.string()).describe("Array of search keywords. One keyword per array item.")
    }),
    execute: (inputData) => {
        const keywords = inputData.keywords
            .flatMap(k => k.split(/[\s,]+/).filter(Boolean));
        return searchMcpServers(keywords);
    }
})

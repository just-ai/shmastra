import connections from "./index";
import {createTool} from "@mastra/core/tools";
import {z} from "zod";

export const searchToolkitsTool = createTool({
    id: "search_toolkits",
    description: "Search for available integration tools by use case. Returns tool name, tool slug, toolkit slug, and whether the toolkit is already connected.",
    inputSchema: z.object({
        query: z.string().describe("Natural language short description of what you want to do"),
    }),
    execute: ({query}) => {
        return connections.searchTools(query);
    }
});

export const getToolSchemaTool = createTool({
    id: "get_toolkit_tool_schema",
    description: "Get input and output schema for a specific integration tool by its slug (e.g. 'GMAIL_SEND_EMAIL'). Use it to create workflow steps from tool.",
    inputSchema: z.object({
        tool: z.string().describe("Tool slug"),
    }),
    execute: ({tool}) => {
        return connections.getToolSchema(tool);
    }
});

export const executeToolkitTool = createTool({
    id: "execute_toolkit_tool",
    description: "Execute a connected toolkit's tool by its slug with given arguments. Use get_toolkit_tool_schema first to get the required input schema.",
    inputSchema: z.object({
        tool: z.string().describe("Tool slug (e.g. 'GMAIL_SEND_EMAIL')"),
        arguments: z.record(z.string(), z.unknown()).optional().describe("Tool input arguments matching its schema"),
    }),
    execute: ({tool, arguments: args}) => {
        return connections.executeTool(tool, args);
    }
});

const connectResumeSchema = z.object({
    cancelled: z.boolean().optional(),
    completed: z.boolean().optional(),
});

export const connectToolkitTool = createTool({
    id: "connect_toolkit",
    description: "Authorize user in selected toolkit. User will receive authorization link. Tool returns toolkit connection status once user completes auth.",
    inputSchema: z.object({
        reason: z.string().describe("Brief reason why you need to connect this toolkit"),
        toolkit: z.string().describe("Toolkit slug to connect")
    }),
    suspendSchema: z.object({}),
    resumeSchema: connectResumeSchema,
    execute: async ({toolkit}, context) => {
        const resumeData = context?.agent?.resumeData as z.infer<typeof connectResumeSchema> | undefined;
        const suspend = context?.agent?.suspend;

        if (!resumeData) {
            await suspend?.({});
            return { isConnected: false, suspended: true };
        }

        if (resumeData.cancelled) {
            return { isConnected: false, cancelled: true };
        }

        return {
            isConnected: await connections.isToolkitConnected(toolkit)
        };
    }
});
# Mastra Integrations Reference

How to integrate Mastra agents and workflows with third-party services.

## Toolkits

**Use this section only if you have `search_toolkits` and `connect_toolkit` tools**

Toolkits provide ready-to-use third-party services integrations like Gmail, Google Drive, Slack and others.
Call `search_toolkits` tool to check if some third-party service provides suitable tools for your agent or workflow needs.

1. If there are no toolkits were found - go to the MCP server search or implement your own API implementation (see below).
2. If there are some appropriate tookits were found, check if it is connected or not (check field `connected` from `search_toolkits` tool response).
3. If toolkit is not connected yet - ask user to connect it calling `connect_toolkit` tool. IT IS MANDATORY!
4. If toolkit is connected already - you can use suitable tools from it in your agents via `getConnectedTools()`:

```typescript
import {getToolkitTools} from "../shmastra/connections";

const agent = new Agent({
  // ...
  tools: createAgentTools({
    ...(await getConnectedTools(["SEND_GMAIL", "READ_GMAIL"])),
    otherTool,
  }),
});
```

IMPORTANT: use `connect_toolkit` tool to connect toolkits that are not connected yet!

If you create workflow - you can use any tool as a step of workflow.
To use any toolkit tool as a step, or call tool outside agent, **you have to get tool input and output schema** using `get_toolkit_tool_schema` tool.

**Obtain toolkit tool schema ONLY if you plan to use any toolkit tool outside the agent or as a workflow step**

## Prefer MCP over API

If no ready-to-use integration was found, you have to find appropriate MCP or implement third-party service API.

> Always prefer discovering MCP servers first before implementing your own third-party API connection.

## Searching for MCP Servers

Use the `search_mcp_servers` tool to find relevant MCP servers. 
It accepts an array of keywords and returns a list of servers with their details.

### Selecting the most relevant server

After searching, pick the best server by:

1. **Match by available tools** — inspect `details.tools` and check that tool names/descriptions match the integration task. Prefer servers whose tool set directly covers the required operations.
2. **Prefer verified servers** — prefer validated servers. Validated servers are more reliable and maintained.

## Filling environment variables

Some servers require environment variables.
Once you selected a server, ask user to fill its env variables via `ask_env_vars_safely` - it will store variable values to `.env` file safely.

## Creating an MCPClient

Once a server is selected and environment variables are saved, create an `MCPClient` from `@mastra/mcp` using its `package.identifier`:

```typescript
import { MCPClient } from "@mastra/mcp";

const mcp = new MCPClient({
  servers: {
    myServer: {
      command: "npx",
      args: ["-y", server.package.identifier],
      env: {
        SOME_VAR_NAME: process.env.MY_API_KEY!,
        // map server.package.environmentVariables to process.env values
      },
    },
  },
});
```

- Use the `package.identifier` (npm package name) as the `args` value for `npx -y`.
- Map required `environmentVariables` from `server.package.environmentVariables` to the `env` object.

### Getting tools for an agent

After creating the client, retrieve the tools to inject into your agent using `listTools()`:

```typescript
const agent = new Agent({
  // ...
  tools: createAgentTools({
    ...(await mcp.listTools()),
    otherTool,
  }),
});
```

### Filtering tools to reduce context window

The MCP server may expose many tools.
To keep the agent's context window small, **filter to only the tool names you need**.

> `listTools()` returns object with keys as tool name - filter entries with tool names you need

## Multiple MCP servers

You can add as much servers to `MCPClient` instance as you need.

## API as a fallback

Create hand-written API implementation **only if there is no suitable MCP servers you can use**.
If you're going to create custom API implementation:

1. Discover API docs first to know the latest version of API
2. Prefer using ready-to-use nodejs client if any is available

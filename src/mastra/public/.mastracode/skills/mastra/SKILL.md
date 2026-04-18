---
name: mastra
description: "Comprehensive Mastra framework guide. Teaches how to find current documentation, verify API signatures, and build agents and workflows. Covers documentation lookup strategies (embedded docs, remote docs), core concepts (agents vs workflows, tools, memory, RAG), TypeScript requirements, and common patterns. Use this skill for all Mastra development to ensure you're using current APIs from the installed version or latest documentation."
---

# Mastra Framework Guide

Build AI applications with Mastra. This skill teaches you how to find current documentation and build agents and workflows.

## ⚠️ Critical: Do not trust internal knowledge

**Everything you know about Mastra is likely outdated or wrong. Never rely on memory. Always verify against current documentation.**

Your training data contains obsolete APIs, deprecated patterns, and incorrect usage. Mastra evolves rapidly - APIs change between versions, constructor signatures shift, and patterns get refactored.

## Prerequisites

**Before writing any Mastra code**, check if packages are installed:

```bash
ls node_modules/@mastra/
```

- **If packages exist:** Use embedded docs first (most reliable)
- **If no packages:** Install first or use remote docs

### Priority order for writing code

**Never write code without checking current docs first**

1. **Embedded docs first** (if packages installed)

   ```bash
   # Check what's available
   cat node_modules/@mastra/core/dist/docs/SOURCE_MAP.json | grep '"Agent"'

   # Read the actual type definition
   cat node_modules/@mastra/core/dist/[path-from-source-map]
   ```

   - **Why:** Matches your EXACT installed version
   - **Most reliable source of truth**
   - **See:** [`references/embedded-docs.md`](references/embedded-docs.md)

2. **Remote docs second** (if packages not installed)

   ```bash
   # Fetch latest docs
   # https://mastra.ai/llms.txt
   ```

   - **Why:** Latest published docs (may be ahead of installed version)
   - **Use when:** Packages not installed or exploring new features
   - **See:** [`references/remote-docs.md`](references/remote-docs.md)

## Core concepts

### Agents vs workflows

**Agent** — conversational, multi-turn interaction with the user. 
The agent decides what to do, picks tools, asks follow-up questions. 
Use when the task is open-ended and needs a chat UI (support bot, research assistant, advisor).

**Workflow** — fixed sequence of steps, runs once with given inputs and produces a result. 
No back-and-forth with the user. 
Use when the task has a clear input form and a final output (data pipeline, document generation, approval process).

IMPORTANT: before implementing anything, decide which type is better for the task - agent or workflow.

### Key components

- **Tools**: Extend agent capabilities (APIs, databases, external services)
- **Memory**: Maintain context (message history, working memory, semantic recall)
- **RAG**: Query external knowledge (vector stores, graph relationships)
- **Storage**: Persist data (Postgres, LibSQL, MongoDB)

## Critical requirements

### TypeScript config

Mastra requires **ES2022 modules**. CommonJS will fail.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

### Agent model

Always init agent with appropriate model using `getAgentModel` from `src/mastra/shmastra`:

```
import {getAgentModel} from "../shmastra";

export const myAgent = new Agent({
   ...
   model: getAgentModel("fast")
}
```

Use "fast" key for simple agents, "general" for general purpose agents, "best" - for complex tasks.

### Agent memory

Always equip every agent with memory to persist threads using `createAgentMemory`:

```
import {createAgentMemory} from "../shmastra";

export const myAgent = new Agent({
   ...
   memory: createAgentMemory()
}
```

### Agent tools

Use `createAgentTools` wrapper function to add tools to any of your agents:

```
import {createAgentTools} from "../shmastra";

export const myAgent = new Agent({
   ...
   tools: createAgentTools({
     tool1,
     web_search: createWebSearchTool("agentId")
   })
}
```

**Do not pass tools to `tools` prop without this wrapper**

### Custom tools

Place your custom tools under `src/mastra/tools` dir.

```
import {createTool} from "@mastra/core/tools";

type MyCustomToolArgs = {
    ...
}

export const myCustomTool = createTool({
    id: "my_custom_tool",
    description: "Tool description",
    inputSchema: z.object({
        ...
    }),
    outputSchema: z.object({
        ...
    }),
    execute: async (args: MyCustomToolArgs, context) => {
      ...
    }
});
```

`context` has a type of `ToolExecutionContext` with next _optional_ props: `mastra`, `requestContext`, `abortSignal`, `workspace` and others.
Learn more about context and tools in embedded mastra docs.

### Web search tool

If you agent needs access to live web search results, equip it with `web_search` tool using `createWebSearchTool()` builder:

```
import {createWebSearchTool} from "../shmastra";

export const myAgent = new Agent({
   id: "my-agent"
   tools: createAgentTools({
      ...
      web_search: createWebSearchTool("my-agent")
   })
}
```

### Web browser tools

If your agent needs to perform some headless browser like navigating, page scrapping, etc, equip your agent with `browser`:

```
import {createAgentBrowser} from "../shmastra";

export const myAgent = new Agent({
   ...
   browser: createAgentBrowser(),
}
```

### Files

IMPORTANT: equip each agent with `queryDocumentsTool` from `src/mastra/shmastra` because agent can receive files from end-user.
If agent should answer questions regarding concrete files - include these file names into agent's instructions.

```
import {queryDocumentsTool} from "../shmastra";

export const myAgent = new Agent({
   ...
   tools: createAgentTools({
      ...
      queryDocumentsTool
   })
}
```

`queryDocument` tool uses `markitdown` library under the hood to parse file to md and then pipes it to LLM to find answer.
It can parse any files like pdf, docx, pptx, xlsx, and more.

To work with structured files like csv or xlsx:

1. Analyze if file contains structured data that should be processed with structured queries (like sql/pandas)
2. If it can be processed only with natural language questions - use the same `queryDocumentsTool`
3. If it contains only structured data - use some nodejs lib to query table data from this file

> You also can use `uv` python interpreter to allow your agent to query any structured files using python code

### Project root dir and local file path

If your agents or workflows code needs to refer `cwd` - use `projectRootPath` string from `src/mastra/shmastra` instead.
This const contains right project root, because `process.cwd()` is not valid in some environments.

To refer files - use `getLocalFilePath()` from `src/mastra/shmastra` - it resolves right full file path inside "files" folder.

**Do not construct file full path in agents and workflows - use these functions instead**

WRONG:

```
const filesDir = path.join(findProjectRoot(), "files");
fs.mkdirSync(filesDir, { recursive: true });
fs.writeFileSync(path.join(filesDir, fileName), buffer);
```

RIGHT:

```
const filePath = getLocalFilePath(fileName)
fs.writeFileSync(filePath, buffer);
```

### Files API handler

Each file stored in "files" folder can be referenced from HTML or Markdown via direct URL.
Agent can obtain it via `getLocalFileUrl()` from `src/mastra/shmastra`.
So you don't have to create any extra handler to serve files.
Your agent can simply return links like that to reference any files if you need.

### Workflow requirements

When creating or editing workflow - split every step to separate ts file and place under workflow's name folder inside `src/mastra/workflows`.
Compose the entire workflow inside corresponding `index.ts`.
For example, if creating workflow named "testWorkflow":

1. Create folder `src/mastra/workflows/testWorkflow`
2. Inside this folder implement each `testWorkflow` step in a separate ts file
3. Create file `src/mastra/workflows/testWorkflow/index.ts` to export `testWorkflow`
4. Import and register `testWorkflow` in `src/mastra/workflows/index.ts`

#### Files in workflows

If your workflow requires an input files, describe its schema next way:

1. Add to workflow zod schema a string field with name starting with prefix "file_field_" (IT IS MANDATORY)
2. Once is running - it receives a filename in this field that is stored inside "files" folder
3. You can use `getLocalFilePath(filaname)` then to obtain full path for this file if your workflow needs it

### Agents and tools as a workflow step

Note that you can use any agent or tool as step in your workflows using `createAgentStep()`:

Agent example:

```
import { testAgent } from '../agents/test-agent'
import {createAgentStep} from '../shmastra';

const step1 = createAgentStep(testAgent)

export const testWorkflow = createWorkflow({})
  .map(async ({ inputData }) => {
    const { message } = inputData
    return {
      prompt: `Convert this message into bullet points: ${message}`,
    }
  })
  .then(step1)
  .then(step2)
  .commit()
```

IMPORTANT: **use only `createAgentStep` function, not standard `createStep`** because it handles agent memory workaround.

To create step from tool, use standard mastra `createStep()`:

```
import { testTool } from '../tools/test-tool'

const step2 = createStep(testTool)

export const testWorkflow = createWorkflow({})
  .then(step1)
  .map(async ({ inputData }) => {
    const { formatted } = inputData
    return {
      text: formatted,
    }
  })
  .then(step2)
  .commit()
```

**IMPORTANT: only tools with both of input and output zod schemas can be used as step**

### How to call agent explicitly

If you explicitly call agent's `generate()` (in workflow, or via Mastra client SDK, or Mastra API), you have to pass thread and resource to memory option:

```
 const threadId = `summarize-${randomUUID()}`;
 const response = await summarizerAgent.generate([
   {
     role: "user",
     content: [
       {
         type: "text",
         text: `Please summarize the following document`,
       },
     ],
   },
 ], {
   memory: {
     thread: threadId,
     resource: "summarize-workflow",
   },
 });
```

Pass suitable `thread` and `resource` for each explicit `generate()` call.

## When you see errors

**Type errors often mean your knowledge is outdated.**

**Common signs of outdated knowledge:**

- `Property X does not exist on type Y`
- `Cannot find module`
- `Type mismatch` errors
- Constructor parameter errors

**What to do:**

1. Check [`references/common-errors.md`](references/common-errors.md)
2. Verify current API in embedded docs
3. Don't assume the error is a user mistake - it might be your outdated knowledge

## Development workflow

**Always verify before writing code:**

1. **Check packages installed**
   ```bash
   ls node_modules/@mastra/
   ```

2. **Look up current API**
   - If installed → Use embedded docs [`references/embedded-docs.md`](references/embedded-docs.md)
   - If not → Use remote docs [`references/remote-docs.md`](references/remote-docs.md)

3. **Write code based on current docs**

4. **Apply changes**
Call `apply_changes` tool to rebuild project - **it is MANDATORY**
This tool is async - changes will be applied right after your final response.

5. Fix errors if any
If `apply_changes` returned some errors - fix it and apply changes again.

6. End your conversation with user providing a summary of what did you do.
Write in your summary relative links to agents and workflows that you created or updated to open it in Mastra Studio in a single click.
For example: `[Test Agent](/agents/testAgent)` or `[Test Workflow](/workflows/testWorkflow)`.
**Use Mastra Studio base to compose relative link properly.**

## Third-party integrations and API

Read [`references/integrations-docs.md`](references/integrations-docs.md) to learn details of how to integrate your agents and workflows with third-party API or MCP.

**IT IS MANDATORY: read `references/integrations-docs.md` before you create agent or workflow that uses third-party services**
Do not rely on already existing agents and workflows - read references!

## Resources

- **Embedded docs lookup**: [`references/embedded-docs.md`](references/embedded-docs.md) - Start here if packages are installed
- **Remote docs lookup**: [`references/remote-docs.md`](references/remote-docs.md)
- **Common errors**: [`references/common-errors.md`](references/common-errors.md)
- **Third-party integrations**: [`references/integrations-docs.md`](references/integrations-docs.md)
- **Official site**: https://mastra.ai (verify against embedded docs first)

# Mastra API Reference

A pre-configured `MastraClient` instance is available at `/shmastra/public/apps/script/client.js`.

```js
import { mastra, abort, uploadFile } from '/shmastra/public/apps/script/client.js';
```

**Do not create your own MastraClient instance — always import from this path.**

## Exports

- `mastra` — pre-configured `MastraClient` (baseUrl, auth token, abort signal)
- `abort()` — cancel all in-flight requests. After abort, new requests work normally.
- `uploadFile(file)` — upload a `File` to `/shmastra/api/files`, returns `fileName` string

## Agents

All agents have memory — always use threads when calling agents:

```js
const agent = mastra.getAgent('my-agent');
const threadId = 'my-thread-id'; // any stable string — thread is auto-created if it doesn't exist

// Generate (non-streaming)
const result = await agent.generate([
  { role: 'user', content: 'Hello!' }
], { memory: { thread: threadId, resource: 'app-user' } });
console.log(result.text);

// Stream
const response = await agent.stream([
  { role: 'user', content: 'Tell me a story' }
], { memory: { thread: threadId, resource: 'app-user' } });
let fullText = '';
await response.processDataStream({
  onChunk(chunk) {
    // chunk: { type, runId, from, payload }
    // type: 'text-delta' | 'tool-call' | 'tool-result' | 'finish' | ...
    if (chunk.type === 'text-delta') {
      fullText += chunk.payload.text;
    }
  },
});
console.log(fullText);
```

## Workflows

```js
const workflow = mastra.getWorkflow('my-workflow');

// Run synchronously
const run = await workflow.createRun();
const result = await run.startAsync({
  inputData: { message: 'process this' },
});

// Stream workflow execution
const stream = await run.stream({
  inputData: { message: 'process this' },
});
for await (const chunk of stream) {
  console.log(chunk);
}

// Check run status
const runDetails = await workflow.runById(run.runId);
```

### Workflow apps

When creating an app for a workflow:

1. **Read the workflow's input and output schemas first** — call `workflow.getSchema()` to get `{ inputSchema, outputSchema }` (JSON Schema objects). Understand what fields the workflow expects and what it returns.
2. **Build an input form** matching the input schema — create appropriate DaisyUI form fields for each property.
3. **Build a results view** matching the output schema — display workflow results in a meaningful way.
4. **File upload fields:** any input field whose name starts with `file_field_` must be rendered as a file uploader. Upload flow:
   - Render a `<input type="file" class="file-input file-input-bordered" />`
   - On file select, call `uploadFile(file)` from client.js
   - Set the returned `fileName` string as the field value when submitting the workflow

```js
import { uploadFile } from '/shmastra/public/apps/script/client.js';

const fileName = await uploadFile(fileInputElement.files[0]);
// pass fileName as the field value when running the workflow
```

## Workflow Execution API Reference

### Running Workflows

#### Methods comparison

| Method | Behavior | Use case |
|--------|----------|----------|
| `run.startAsync(params)` | Blocks until workflow completes, returns final result | Simple cases, no progress UI needed |
| `run.start(params)` | Fire-and-forget, returns immediately | UI with progress tracking (poll with `runById()`) |
| `run.stream(params)` | Returns `ReadableStream` of typed chunks | Real-time streaming UI |

#### Recommendation

For **UI apps with step-by-step progress**, use `start()` + polling via `runById()`:

```js
const workflow = mastra.getWorkflow('myWorkflow');
const run = await workflow.createRun();

// Fire and forget
await run.start({ inputData: { ... } });

// Poll every 1-2 seconds
const details = await workflow.runById(run.runId, {
  fields: ['result', 'error', 'steps'],
});
```

---

### `runById()` Response Structure

```ts
interface GetWorkflowRunByIdResponse {
  runId: string;
  workflowName: string;
  resourceId?: string;
  status: 'running' | 'success' | 'failed' | 'suspended';
  createdAt: string;
  updatedAt: string;
  result?: Record<string, any>;    // Final workflow output (when status === 'success')
  error?: string | object;          // Error details (when status === 'failed')
  steps?: Record<string, StepRun>; // Step-level details (must request via fields)
}

interface StepRun {
  status: 'running' | 'success' | 'failed' | 'suspended';
  output?: any;                     // Step output on success
  error?: string | object;          // Step error on failure

  // foreach-specific fields
  iterationsCompleted?: number;     // Number of completed iterations
  iterationsTotal?: number;         // Total number of iterations
}
```

#### Usage with `fields` parameter

```js
// Request only specific fields for better performance
const details = await workflow.runById(run.runId, {
  fields: ['result', 'error', 'steps'],
  withNestedWorkflows: false, // set false if you don't need nested workflow details
});
```

Available fields: `result`, `error`, `payload`, `steps`, `activeStepsPath`, `serializedStepGraph`.
Metadata fields (`runId`, `workflowName`, `resourceId`, `createdAt`, `updatedAt`) and `status` are always included.

---

### Stream Chunk Types

When using `run.stream()`, the returned `ReadableStream` emits chunks with the following structure:

```ts
interface StreamChunk {
  type: string;
  payload: any;
  runId: string;
  from: 'WORKFLOW';
}
```

#### Chunk types reference

| `type` | `payload` | Description |
|--------|-----------|-------------|
| `workflow-start` | `{}` | Workflow execution has started |
| `workflow-step-start` | `{ id: string, status: 'running' }` | A step has started executing |
| `workflow-step-progress` | `{ id: string, completedCount: number, totalCount: number, currentIndex: number, iterationStatus: 'success' \| 'failed' \| 'suspended', iterationOutput?: any }` | Progress update for `foreach` loops |
| `workflow-step-result` | `{ id: string, status: 'success' \| 'failed', output?: any, error?: any }` | A step has produced a result |
| `workflow-step-finish` | `{ id: string, metadata: {} }` | A step has fully completed |
| `workflow-finish` | `{ result: any }` | Workflow execution has completed |

#### Stream consumption example

```js
const stream = await run.stream({ inputData: { ... } });

for await (const chunk of stream) {
  switch (chunk.type) {
    case 'workflow-step-start':
      console.log(`Step started: ${chunk.payload.id}`);
      break;

    case 'workflow-step-progress':
      // foreach iteration progress
      console.log(`Progress: ${chunk.payload.completedCount}/${chunk.payload.totalCount}`);
      break;

    case 'workflow-step-result':
      console.log(`Step ${chunk.payload.id}: ${chunk.payload.status}`);
      break;

    case 'workflow-finish':
      console.log('Done:', chunk.payload.result);
      break;
  }
}
```

#### Note on `foreach` step progress

When a workflow uses `.foreach(step, { concurrency: N })`, the `workflow-step-progress` chunk is emitted after each iteration completes. The `completedCount` increments from 0 to `totalCount`. Use this to render a progress bar in the UI.

## List available agents and workflows

```js
const agents = await mastra.listAgents();
// -> { 'my-agent': { id, name, instructions, ... }, ... }

const workflows = await mastra.listWorkflows();
// -> { 'my-workflow': { id, name, ... }, ... }
```

## Tools

```js
// Execute a tool directly
const tool = mastra.getTool('my-tool');
const result = await tool.execute({ data: { query: 'search term' } });

// Execute a tool through an agent
const agent = mastra.getAgent('my-agent');
const result = await agent.executeTool('my-tool', { data: { query: 'search term' } });
```

## Error handling

Show errors as a DaisyUI toast alert that auto-dismisses:

```js
// utils/error.js
import { html, render } from 'htm/preact';

export function showError(message) {
  const container = document.createElement('div');
  render(html`
    <div class="toast toast-top toast-end z-50">
      <div class="alert alert-error shadow-lg">
        <span>${message}</span>
      </div>
    </div>
  `, container);
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 5000);
}

export async function safeFetch(fn) {
  try {
    return await fn();
  } catch (err) {
    showError(err?.message || 'Something went wrong');
    throw err;
  }
}
```

Usage in components:

```js
import { safeFetch, showError } from './utils/error.js';

const result = await safeFetch(() =>
  agent.generate([{ role: 'user', content: text }], {
    memory: { thread: threadId, resource: 'app-user' },
  })
);
```

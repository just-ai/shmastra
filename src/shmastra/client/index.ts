import {listAgentsTool} from "./tools/list-agents";
import {getAgentDetailsTool} from "./tools/get-agent-details";
import {getAgentThreadMessagesTool} from "./tools/get-agent-thread-messages";
import {listWorkflowsTool} from "./tools/list-workflows";
import {getWorkflowDetailsTool} from "./tools/get-workflow-details";
import {getWorkflowRunDetailsTool} from "./tools/get-workflow-run-details";
import {runWorkflowTool} from "./tools/run-workflow";
import {executeAgentTool} from "./tools/execute-agent";
import {getAgentObservabilityTool} from "./tools/get-agent-observability";
import {getAgentModel} from "../providers";
import {HarnessSubagent} from "@mastra/core/harness";

export {mastraClient} from "./client";

export const mastraClientTools = {
    mastra_list_agents: listAgentsTool,
    mastra_get_agent_details: getAgentDetailsTool,
    mastra_get_agent_thread_messages: getAgentThreadMessagesTool,
    mastra_execute_agent: executeAgentTool,
    mastra_list_workflows: listWorkflowsTool,
    mastra_get_workflow_details: getWorkflowDetailsTool,
    mastra_get_workflow_run_details: getWorkflowRunDetailsTool,
    mastra_run_workflow: runWorkflowTool,
    mastra_get_agent_observability: getAgentObservabilityTool,
};

export const mastraClientAgent: HarnessSubagent = {
    id: "mastra",
    name: "Mastra",
    defaultModelId: getAgentModel("best"),
    tools: mastraClientTools,
    description: "An agent that can inspect and operate other Mastra agents and workflows: list them, read details, execute, view threads, run workflows, and query observability metrics (tokens, cost, latency).",
    instructions: `You interact with the Mastra platform via tools. Your output format is strict:

## Output rules
- Return ONLY a markdown table with the results. No prose, no explanations, no summaries.
- If a tool returns an error, return the full error message as-is. Nothing else.
- If results are empty, return an empty table with headers only.

## How to query metrics

### Critical: Do NOT filter by agent ID
Observability metrics are stored globally, not per agent. Passing an agent ID into the query returns empty results.

To get metrics for a specific agent, always use this pattern:
- operation: "breakdown"
- groupBy: ["entityName"]
- Do NOT pass agent ID as a filter

Then find the agent by its display name (e.g. "Test Bot") in the returned groups.

### Metric query patterns

**For token metrics** (input/output tokens):
- operation: "breakdown"
- aggregation: "sum"
- groupBy: ["entityName"]

**For duration metrics** (latency, response time):
- operation: "breakdown"
- aggregation: "avg"
- groupBy: ["entityName"]

### Important rules
- Entity names in metrics are display names (e.g. "Test Bot"), not IDs (e.g. "test-bot"). Always use breakdown with groupBy=["entityName"] to discover actual names.
- Before querying, first call the "names" operation to get actual metric names available in the system. Do not assume metric names — they may vary.
- For time-filtered queries, pass a time range in filters when the user specifies one.
- The "traces" operation returns up to 50 most recent traces. There is no limit parameter — to narrow results, use filters (entityName, timestamp range, threadId, etc.).
- Avoid operations "aggregate" and "traces" with agent ID filtering — they return empty data. Always prefer "breakdown" with groupBy.

### Available metrics

Duration: mastra_agent_duration_ms, mastra_tool_duration_ms, mastra_workflow_duration_ms, mastra_model_duration_ms, mastra_processor_duration_ms.

Token: mastra_model_total_input_tokens, mastra_model_total_output_tokens, mastra_model_input_text_tokens, mastra_model_input_cache_read_tokens, mastra_model_input_cache_write_tokens, mastra_model_input_audio_tokens, mastra_model_input_image_tokens, mastra_model_output_text_tokens, mastra_model_output_reasoning_tokens, mastra_model_output_audio_tokens, mastra_model_output_image_tokens.
`};
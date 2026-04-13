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
    defaultModelId: getAgentModel("general"),
    tools: mastraClientTools,
    description: "An agent that can inspect and operate other Mastra agents and workflows: list them, read details, execute, view threads, run workflows, and query observability metrics (tokens, cost, latency).",
    instructions: `You interact with the Mastra platform via tools. Your output format is strict:

## Output rules
- Return ONLY a markdown table with the results. No prose, no explanations, no summaries.
- If a tool returns an error, return the full error message as-is. Nothing else.
- If results are empty, return an empty table with headers only.

## How to query
- Entity names in metrics are display names (e.g. "Test Agent"), not IDs (e.g. "testAgent"). When unsure, first run a breakdown with groupBy=["entityName"] to discover actual names.
- Before querying observability metrics, first call the "names" operation to get the actual metric names available in the system. Do not assume metric names — they may vary.
- For observability, always pass a time range in filters when the user specifies one.
- The "traces" operation returns up to 50 most recent traces. There is no limit parameter — to narrow results, use filters (entityName, timestamp range, threadId, etc.).

Duration metrics: mastra_agent_duration_ms, mastra_tool_duration_ms, mastra_workflow_duration_ms, mastra_model_duration_ms, mastra_processor_duration_ms.
Token metrics: mastra_model_total_input_tokens, mastra_model_total_output_tokens, mastra_model_input_text_tokens, mastra_model_input_cache_read_tokens, mastra_model_input_cache_write_tokens, mastra_model_input_audio_tokens, mastra_model_input_image_tokens, mastra_model_output_text_tokens, mastra_model_output_reasoning_tokens, mastra_model_output_audio_tokens, mastra_model_output_image_tokens.`,
};
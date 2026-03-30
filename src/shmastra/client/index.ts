import {listAgentsTool} from "./tools/list-agents";
import {getAgentDetailsTool} from "./tools/get-agent-details";
import {getAgentThreadMessagesTool} from "./tools/get-agent-thread-messages";
import {listWorkflowsTool} from "./tools/list-workflows";
import {getWorkflowDetailsTool} from "./tools/get-workflow-details";
import {getWorkflowRunDetailsTool} from "./tools/get-workflow-run-details";
import {runWorkflowTool} from "./tools/run-workflow";
import {executeAgentTool} from "./tools/execute-agent";

export {mastraClient} from "./client";

export const mastraClientTools = {
    //mastra_list_agents: listAgentsTool,
    mastra_get_agent_details: getAgentDetailsTool,
    mastra_get_agent_thread_messages: getAgentThreadMessagesTool,
    mastra_execute_agent: executeAgentTool,
    //mastra_list_workflows: listWorkflowsTool,
    mastra_get_workflow_details: getWorkflowDetailsTool,
    mastra_get_workflow_run_details: getWorkflowRunDetailsTool,
    mastra_run_workflow: runWorkflowTool,
};

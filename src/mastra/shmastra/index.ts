import {findProjectRoot} from "../../shmastra/files";

/**
 * An absolute path to project's root dir.
 */
export const projectRootPath: string = findProjectRoot();

/**
 * Obtain an absolute path to the file in "files" folder.
 *
 * Example: `getLocalFilePath("file.txt")`
 *
 * @param file - name or relative path of file
 * @returns [string] - absolute path to file in "files" folder
 */
export { getLocalFilePath } from "../../shmastra/files";

/**
 * Obtain relative public URL of file in "files" folder.
 *
 * Example: `getLocalFileUrl("file.txt")`
 *
 * @param file - name or relative path of file
 * @returns [string] - relative public URL of this file like "/shmastra/api/files/filename"
 */
export { getLocalFileUrl } from "../../shmastra/files";

/**
 * Function to obtain the most suitable model for agent.
 * Use it for `model` prop of any agent.
 *
 * Example: `getAgentModel("fast")`
 *
 * @param key - type of model: "fast" for simple agents, "general" for general purpose agents, "best" - for complex tasks
 * @returns [string] - model in format "provider-id/model-id"
 */
export { getAgentModel } from "../../shmastra/providers";

/**
 * Function to create memory for agent.
 * Use this function for every agent you create:
 *
 * ```
 * import {createAgentMemory} from "../shmastra";
 *
 * export const myAgent = new Agent({
 *    ...
 *    memory: createAgentMemory()
 * }
 * ```
 */
export { createAgentMemory } from "../../shmastra/memory";

/**
 * Function to add tools to any of your agents.
 * It accepts object with keys as tool names and values as complete tools or dynamic tool factories.
 * Use it as wrapper around tools instead of simply passing tools to the agent.
 *
 * ```
 * import {createAgentTools} from "../shmastra";
 *
 * export const myAgent = new Agent({
 *    ...
 *    tools: createAgentTools({
 *      tool1,
 *      web_search: createWebSearchTool("agentId")
 *    })
 * }
 * ```
 *
 * @param tools - record where keys are tool names and values are either a complete tool or a `DynamicArgument` factory (a function that receives agent context and returns tools at runtime)
 * @returns `DynamicArgument<ToolsInput>` - a dynamic tool factory resolved at runtime, ready to pass to agent's `tools` prop
 */
export { createAgentTools } from "../../shmastra/tools";

/**
 * Function to add messaging channels like Telegram, Slack, etc to your agents.
 * Use it as a wrapper around channels instead of passing channel adapters.
 * You have to use suitable adapter factory from @chat-adapter
 *
 * ```
 * import {createAgentChannels} from "../shmastra";
 * import {createTelegramAdapter} from "@chat-adapter/telegram";
 *
 * export const myAgent = new Agent({
 *    ...
 *    channels: createAgentChannels({
 *      adapters: {
 *       telegram: createTelegramAdapter({
 *         botToken: process.env.TEST_AGENT_TELEGRAM_BOT_TOKEN,
 *       })
 *     }
 *    })
 * }
 * ```
 */
export { createAgentChannels } from "../../shmastra/channels";

/**
 * Function to create workflow step from agent instance.
 * Use this function instead of mastra `createStep`.
 *
 * @param agent - [Agent] instance to create step from
 * @param options - [AgentStepOptions] optional step options
 *
 * @returns step that accepts object `{prompt: string}` and returns object `{text: string}`
 */
export { createAgentStep } from "../../shmastra/workflow";

/**
 * Tool for agent to query any unstructured local file.
 * Equip all your agents with this tool.
 * This tool uses LLM agent under the hood - so you don't need extra agent to use it in your workflows usually.
 */
export { queryDocumentsTool } from "../../shmastra/rag";

/**
 * Creates a web search tool dynamically for a particular agent.
 *
 * @param agentId - id of the agent to create the web search tool for
 * @returns `DynamicArgument<ToolsInput>` - a dynamic tool factory that resolves the appropriate web search tool at runtime, factory returns `{web_search: ToolAction}`
 */
export { createWebSearchTool } from "../../shmastra/tools";

/**
 * Headless web browser with tools to navigate, click, taking snapshots, etc.
 * Set for every agent that really needs it.
 * Appends at least 15 browser tools to agent.
 *
 * ```
 * import {createAgentBrowser} from "../shmastra";
 *
 * export const myAgent = new Agent({
 *    ...
 *    browser: createAgentBrowser(),
 * }
 * ```
 */
export { createAgentBrowser } from "../../shmastra/browser";
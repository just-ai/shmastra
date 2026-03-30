import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {randomUUID} from "crypto";
import {mastraClient} from "../client";
import {MessageListInput} from "@mastra/core/agent/message-list";

const contentPartSchema = z.union([
    z.object({
        type: z.literal("text").describe("The type of content part ('text' or 'image')"),
        text: z.string().describe("The text content"),
    }),
    z.object({
        type: z.literal("image").describe("The type of content part ('text' or 'image')"),
        image: z.string().describe("URL of the image"),
    }),
]);

const messageSchema = z.object({
    role: z.enum(["user", "assistant"]).describe("The role of the message sender"),
    content: z.array(contentPartSchema).describe("The message content as array of content parts"),
});

export const executeAgentTool = createTool({
    id: "execute_agent",
    description: "Send messages to agent and get the final text response along with a threadId for follow-up calls",
    inputSchema: z.object({
        agentId: z.string().describe("The agent ID"),
        messages: z.array(messageSchema).describe("Array of OpenAI-format messages to send to the agent"),
        threadId: z.string().optional().describe("Thread ID to continue an existing conversation. Omit to start a new thread."),
    }),
    execute: async (input) => {
        const threadId = input.threadId ?? randomUUID();
        const agent = (await mastraClient()).getAgent(input.agentId);
        const response = await agent.generate(
            input.messages as MessageListInput,
            {
                memory: {
                    thread: threadId,
                    resource: "execute-agent-prompt-tool"
                }
            }
        );
        return {text: response.text, threadId};
    }
});

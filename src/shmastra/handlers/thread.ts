import {ShmastraCode} from "../code";
import {HarnessMessageContent, HarnessThread} from "@mastra/core/harness";
import {Handler} from "hono";

const stripPagePrefix = (text: string) => {
    return text
        .replace(/\n<current-page>[\s\S]*?<\/current-page>*/g, '')
        .replace(/\n<attachments>[\s\S]*?<\/attachments>*/g, '');
}

const toParts = (content: HarnessMessageContent[]) => {
    const toolCallMap: Record<string, any> = {};
    for (const item of content) {
        if (item.type === "tool_call") {
            toolCallMap[item.id] = item;
        }
    }
    const parts: any[] = [];
    for (const item of content) {
        if (item.type === "file") {
            parts.push(item);
        } else if (item.type === "text") {
            parts.push({ ...item, text: stripPagePrefix(item.text) });
        } else if (item.type === "tool_result") {
            const call = toolCallMap[item.id];
            if (call) {
                parts.push({
                    toolCallId: item.id,
                    type: "tool-" + item.name,
                    state: "output-available",
                    input: call.args,
                    output: item.result,
                });
            }
        }
    }
    return parts;
};

export const threadHandler = (code: ShmastraCode): Handler => async c => {
    const threadId: string | undefined = c.req.param('threadId');
    let thread: HarnessThread | undefined = undefined;
    if (threadId) {
        thread = await code.harness.findThreadById(threadId);
    }
    if (!thread) {
        thread = await code.harness.createThread();
        await code.harness.switchModel({
            modelId: code.harness.getCurrentModelId(),
            scope: "thread"
        });
        thread = await code.harness.findThreadById(thread.id);
    }

    const models = (await code.harness.listAvailableModels())
        .filter(m => m.hasApiKey);

    const messages = await code.harness.listMessagesForThread({threadId: thread!.id});

    return c.json({
        thread,
        models: models.map(m => m.id),
        messages: messages
            .map(({ content, ...m }) => ({ ...m, parts: toParts(content) }))
            .filter(m => m.parts.length > 0)
    });
}
import { toAISdkStream } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import {ShmastraCode} from "../code";
import {Handler} from "hono";
import {resolveFileUrl} from "../files";
import {RequestContext} from "@mastra/core/request-context";

const MODEL_MIGRATIONS: Record<string, string> = {
    'anthropic/claude-opus-4-6': 'anthropic/claude-opus-4-7',
};

const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

const resolveModelId = async (code: ShmastraCode, requestedModelId: string): Promise<string> => {
    const target = MODEL_MIGRATIONS[requestedModelId];
    if (!target) return requestedModelId;
    const available = (await code.harness.listAvailableModels()).filter(m => m.hasApiKey);
    return available.some(m => m.id === target) ? target : requestedModelId;
};

type FilePart = {
  type: "file";
  filename: string;
  mediaType: string;
  url: string;
}

export const chatHandler = (code: ShmastraCode): Handler => {
  return async c => {
    const signal = c.req.raw.signal;
    const referer = c.req.header('referer');
    const { messages, modelId: requestedModelId, threadId, path: bodyPath, timezone } = await c.req.json();
    const modelId = await resolveModelId(code, requestedModelId);
    const path = bodyPath && bodyPath !== "/" ? bodyPath : (referer ? new URL(referer).pathname : "/");

    const message = messages[messages.length - 1];

    const files: FilePart[] = message.parts
        .filter((p: {filename?: string}) => p.filename);

    const images = files
        .filter(p => ALLOWED_IMAGE_TYPES.has(p.mediaType));

    const imageUrls = await Promise
        .all(images.map(img => resolveFileUrl(img.url, img.mediaType)));

    let content = message.parts
        .find((p: { text?: string }) => p.text)?.text;

    if (files.length) {
      content += `\n<attachments>${files.map(f => f.filename).join(", ")}</attachments>`;
    }

    if (path) {
      content += `\n<current-page>${path}</current-page>`;
    }

    if (threadId && code.harness.getCurrentThreadId() !== threadId) {
      await code.harness.switchThread({threadId});
    }

    if (code.harness.getCurrentModelId() !== modelId) {
      await code.harness.switchModel({modelId, scope: "thread"});
    }

    const requestContext = new RequestContext();
    requestContext.set("timezone", timezone);

    const stream = await code.harness.streamMessage({
      content,
      requestContext,
      files: imageUrls.map((data, i) => ({ ...images[i], data }))
    });

    const uiMessageStream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        for await (const part of toAISdkStream(stream, { from: 'agent' })) {
          if (signal.aborted) {
            code.harness.abort();
            break;
          }
          if (!part.type.startsWith("data-")) {
            await writer.write(part as any);
          }
        }
      },
    });

    return createUIMessageStreamResponse({ stream: uiMessageStream });
  }
}

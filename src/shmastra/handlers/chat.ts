import { toAISdkStream } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import {ShmastraCode} from "../code";
import {Handler} from "hono";
import {resolveFileUrl} from "../files";

type FilePart = {
  type: "file";
  filename: string;
  mediaType: string;
  url: string;
}

export const chatHandler = (code: ShmastraCode): Handler => {
  return async c => {
    const signal = c.req.raw.signal;
    const path = new URL(c.req.header('referer') || "").pathname;
    const { messages, modelId, threadId } = await c.req.json();
    const message = messages[messages.length - 1];

    const files: FilePart[] = message.parts
        .filter((p: {filename?: string}) => p.filename);

    const images = files
        .filter(p => p.mediaType.startsWith("image/"));

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

    const stream = await code.harness.streamMessage({
      content,
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

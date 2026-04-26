import type { Mastra } from "@mastra/core/mastra";
import { Agent } from "@mastra/core/agent";
import { PrefillErrorHandler } from "@mastra/core/processors";

export async function getMastra(): Promise<Mastra> {
  const { mastra } = await import("../mastra");
  return mastra;
}

const prefillErrorHandler = new PrefillErrorHandler();

const NO_SAMPLING_MODELS = new Set<string>([
  "anthropic/claude-opus-4-7",
]);

const STRIPPED_SAMPLING_KEYS = [
  "temperature",
  "topP",
  "topK",
  "frequencyPenalty",
  "presencePenalty",
] as const;

function modelId(model: any): string | undefined {
  if (typeof model === "string") return model;
  if (model?.provider && model?.modelId) return `${model.provider}/${model.modelId}`;
  if (typeof model?.id === "string") return model.id;
  return undefined;
}

function stripSamplingFromModelSettings(ms: any): any | undefined {
  if (!ms) return ms;
  const next = { ...ms };
  let changed = false;
  for (const k of STRIPPED_SAMPLING_KEYS) {
    if (k in next) {
      delete next[k];
      changed = true;
    }
  }
  return changed ? next : ms;
}

export function patchAgentStream(agent: Agent) {
  const originalStream = agent.stream.bind(agent);
  agent.stream = function (messages: any, options?: any) {
    const theirs = options?.prepareStep;
    return originalStream(messages, {
      ...options,
      errorProcessors: [prefillErrorHandler, ...options?.errorProcessors ?? []],
      prepareStep: async (args) => {
        const fromTheirs = theirs ? await theirs(args) : undefined;
        const deduplicated = deduplicateItemIds(args.messages);
        const result: any = { ...fromTheirs, messages: deduplicated };
        const id = modelId(result.model ?? args.model);
        if (id && NO_SAMPLING_MODELS.has(id)) {
          const base = result.modelSettings ?? args.modelSettings;
          const stripped = stripSamplingFromModelSettings(base);
          if (stripped !== base) result.modelSettings = stripped;
        }
        return result;
      }
    });
  }
}

export function deduplicateItemIds(messages: any[]): any[] {
  const itemIdCounts = new Map<string, number>();
  for (const message of messages) {
    if (!Array.isArray(message.content?.parts)) continue;
    for (const part of message.content.parts) {
      const itemId = part.providerMetadata?.openai?.itemId;
      if (itemId) itemIdCounts.set(itemId, (itemIdCounts.get(itemId) ?? 0) + 1);
    }
  }
  const duplicated = new Set([...itemIdCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id));
  return messages.map(message => {
    if (!Array.isArray(message.content?.parts)) return message;
    const newParts = message.content.parts.map((part: any) => {
      const itemId = part.providerMetadata?.openai?.itemId;
      if (!itemId || !duplicated.has(itemId)) return part;
      const { itemId: _, ...openaiWithout } = part.providerMetadata.openai;
      return {
        ...part,
        providerMetadata: {
          ...part.providerMetadata,
          openai: openaiWithout,
        },
      };
    });
    return { ...message, content: { ...message.content, parts: newParts } };
  });
}

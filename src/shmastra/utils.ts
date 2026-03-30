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

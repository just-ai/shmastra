import { describe, it, expect } from 'vitest'
import { deduplicateItemIds } from '../src/shmastra/utils'

const partWithId = (id: string, extra: Record<string, unknown> = {}) => ({
    type: 'text',
    text: 'x',
    providerMetadata: {
        openai: { itemId: id, ...extra },
    },
})

const messageWithParts = (parts: any[]) => ({
    id: 'm',
    content: { parts },
})

describe('deduplicateItemIds', () => {
    it('removes itemId from duplicated parts across messages', () => {
        const input = [
            messageWithParts([partWithId('dup')]),
            messageWithParts([partWithId('dup')]),
        ]
        const result = deduplicateItemIds(input)
        for (const m of result) {
            for (const p of m.content.parts) {
                expect(p.providerMetadata.openai.itemId).toBeUndefined()
            }
        }
    })

    it('preserves unique itemIds untouched', () => {
        const input = [
            messageWithParts([partWithId('a')]),
            messageWithParts([partWithId('b')]),
        ]
        const result = deduplicateItemIds(input)
        expect(result[0].content.parts[0].providerMetadata.openai.itemId).toBe('a')
        expect(result[1].content.parts[0].providerMetadata.openai.itemId).toBe('b')
    })

    it('skips messages without parts array', () => {
        const input: any[] = [
            { id: 'm1', content: { parts: 'not-an-array' } },
            messageWithParts([partWithId('dup')]),
            messageWithParts([partWithId('dup')]),
        ]
        const result = deduplicateItemIds(input)
        expect(result[0]).toEqual(input[0])
        expect(result[1].content.parts[0].providerMetadata.openai.itemId).toBeUndefined()
    })

    it('preserves other openai metadata keys while stripping itemId', () => {
        const input = [
            messageWithParts([partWithId('dup', { model: 'gpt-5' })]),
            messageWithParts([partWithId('dup', { model: 'gpt-5' })]),
        ]
        const result = deduplicateItemIds(input)
        expect(result[0].content.parts[0].providerMetadata.openai).toEqual({ model: 'gpt-5' })
    })

    it('returns new objects (does not mutate input)', () => {
        const original = messageWithParts([partWithId('dup')])
        const input = [original, messageWithParts([partWithId('dup')])]
        const result = deduplicateItemIds(input)
        expect(result[0]).not.toBe(original)
        expect(original.content.parts[0].providerMetadata.openai.itemId).toBe('dup')
    })

    it('returns empty array for empty input', () => {
        expect(deduplicateItemIds([])).toEqual([])
    })

    it('leaves parts with no providerMetadata.openai intact', () => {
        const plain = { type: 'text', text: 'hi' }
        const input = [messageWithParts([plain])]
        const result = deduplicateItemIds(input)
        expect(result[0].content.parts[0]).toEqual(plain)
    })
})

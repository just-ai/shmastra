import { describe, it, expect } from 'vitest'
import { fixTelegramMarkdownV1 } from '../../src/shmastra/channels/utils'

describe('fixTelegramMarkdownV1', () => {
    it('removes backslash-newline sequences', () => {
        expect(fixTelegramMarkdownV1('line1\\\nline2')).toBe('line1\nline2')
    })

    it('converts leading "- " to bullets', () => {
        expect(fixTelegramMarkdownV1('- item1\n- item2')).toBe('• item1\n• item2')
    })

    it('does not touch "- " in the middle of a line', () => {
        expect(fixTelegramMarkdownV1('a - b - c')).toBe('a - b - c')
    })

    it('handles empty string', () => {
        expect(fixTelegramMarkdownV1('')).toBe('')
    })

    it('handles mixed multiline content', () => {
        const input = '- first\nbody text\\\nsecond part\n- last'
        const expected = '• first\nbody text\nsecond part\n• last'
        expect(fixTelegramMarkdownV1(input)).toBe(expected)
    })

    it('leaves text without special sequences unchanged', () => {
        expect(fixTelegramMarkdownV1('hello world')).toBe('hello world')
    })
})

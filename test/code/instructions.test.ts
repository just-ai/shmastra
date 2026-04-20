import { describe, it, expect } from 'vitest'
import { extractSection, systemMessageToString } from '../../src/shmastra/code/instructions'

describe('extractSection', () => {
    it('extracts section from heading to double newline', () => {
        const text = '# Intro\n\n# Environment\nkey=value\n\n# Other\nfoo'
        expect(extractSection(text, '# Environment')).toBe('# Environment\nkey=value')
    })

    it('returns empty string when heading is missing', () => {
        expect(extractSection('no heading here', '# Missing')).toBe('')
    })

    it('returns empty string when there is no closing double newline', () => {
        expect(extractSection('# Environment\nonly one block', '# Environment')).toBe('')
    })

    it('handles heading at the start of text', () => {
        expect(extractSection('# Start\nbody\n\nrest', '# Start')).toBe('# Start\nbody')
    })

    it('returns the first occurrence when the heading repeats', () => {
        const text = '# H\nfirst\n\n# H\nsecond\n\n'
        expect(extractSection(text, '# H')).toBe('# H\nfirst')
    })
})

describe('systemMessageToString', () => {
    it('returns string instructions as-is', () => {
        expect(systemMessageToString('hello')).toBe('hello')
    })

    it('joins array of strings with newlines', () => {
        expect(systemMessageToString(['a', 'b', 'c'] as any)).toBe('a\nb\nc')
    })

    it('joins array of objects using .content', () => {
        const msg = [
            { role: 'system', content: 'line1' },
            { role: 'system', content: 'line2' },
        ]
        expect(systemMessageToString(msg as any)).toBe('line1\nline2')
    })

    it('handles mixed array of strings and objects', () => {
        const msg = ['pure', { role: 'system', content: 'obj' }]
        expect(systemMessageToString(msg as any)).toBe('pure\nobj')
    })

    it('returns .content for a single non-array object', () => {
        const msg = { role: 'system', content: 'single' }
        expect(systemMessageToString(msg as any)).toBe('single')
    })
})

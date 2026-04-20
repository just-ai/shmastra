import { describe, it, expect } from 'vitest'
import {
    parseEnvContent,
    updateEnvContent,
    isValidEnvKey,
    formatEnvValue,
} from '../src/shmastra/env'

describe('parseEnvContent', () => {
    it('parses simple KEY=VALUE pairs', () => {
        expect(parseEnvContent('A=1\nB=2')).toEqual({ A: '1', B: '2' })
    })

    it('ignores # comment lines', () => {
        const input = '# leading comment\nFOO=bar\n# trailing'
        expect(parseEnvContent(input)).toEqual({ FOO: 'bar' })
    })

    it('ignores lines without "="', () => {
        expect(parseEnvContent('noequals\nKEY=val\nalso-no-equals')).toEqual({ KEY: 'val' })
    })

    it('preserves "=" inside the value (e.g. base64)', () => {
        expect(parseEnvContent('TOKEN=abc==')).toEqual({ TOKEN: 'abc==' })
    })

    it('preserves full "k=v=w" value after the first "="', () => {
        expect(parseEnvContent('URL=https://a=b&c=d')).toEqual({ URL: 'https://a=b&c=d' })
    })

    it('trims whitespace around the key and value', () => {
        expect(parseEnvContent('  KEY  =  value  ')).toEqual({ KEY: 'value' })
    })

    it('treats indented # as a comment', () => {
        expect(parseEnvContent('   # indented=comment\nX=1')).toEqual({ X: '1' })
    })

    it('returns empty object for empty input', () => {
        expect(parseEnvContent('')).toEqual({})
    })

    it('returns empty object for input with only comments and blanks', () => {
        expect(parseEnvContent('# one\n\n   \n# two')).toEqual({})
    })
})

describe('isValidEnvKey', () => {
    it('accepts typical SCREAMING_SNAKE identifiers', () => {
        expect(isValidEnvKey('FOO')).toBe(true)
        expect(isValidEnvKey('OPENAI_API_KEY')).toBe(true)
        expect(isValidEnvKey('_LEADING_UNDERSCORE')).toBe(true)
        expect(isValidEnvKey('k_1')).toBe(true)
    })

    it('rejects empty, non-identifier, and JS-stringified nullish names', () => {
        expect(isValidEnvKey('')).toBe(false)
        expect(isValidEnvKey('1BAD')).toBe(false)
        expect(isValidEnvKey('has space')).toBe(false)
        expect(isValidEnvKey('KEBAB-CASE')).toBe(false)
        expect(isValidEnvKey('undefined')).toBe(false)
        expect(isValidEnvKey('null')).toBe(false)
    })
})

describe('formatEnvValue', () => {
    it('leaves plain values unquoted', () => {
        expect(formatEnvValue('bar')).toBe('bar')
        expect(formatEnvValue('https://x.example/path?q=1')).toBe('https://x.example/path?q=1')
    })

    it('quotes and escapes values with newlines, quotes, backslashes, or hashes', () => {
        expect(formatEnvValue('a\nb')).toBe('"a\\nb"')
        expect(formatEnvValue('a"b')).toBe('"a\\"b"')
        expect(formatEnvValue('a\\b')).toBe('"a\\\\b"')
        expect(formatEnvValue('url#frag')).toBe('"url#frag"')
    })

    it('quotes values with leading or trailing whitespace', () => {
        expect(formatEnvValue('  spaced  ')).toBe('"  spaced  "')
    })
})

describe('updateEnvContent', () => {
    it('writes new keys with a single trailing newline', () => {
        const out = updateEnvContent('', { FOO: 'bar', BAZ: 'qux' })
        expect(out).toBe('FOO=bar\nBAZ=qux\n')
    })

    it('rejects invalid key names', () => {
        const out = updateEnvContent('', {
            FOO: 'ok',
            undefined: 'oops',
            '': 'empty',
            '1BAD': 'x',
            'has space': 'y',
            'KEBAB-CASE': 'z',
        })
        expect(out).toBe('FOO=ok\n')
    })

    it('overwrites an existing key in place', () => {
        const out = updateEnvContent('FOO=old\nBAR=keep\n', { FOO: 'new' })
        expect(out).toBe('FOO=new\nBAR=keep\n')
    })

    it('appends new keys after existing ones', () => {
        const out = updateEnvContent('FOO=1\n', { BAR: '2' })
        expect(out).toBe('FOO=1\nBAR=2\n')
    })

    it('deletes a key when value is null or undefined', () => {
        const out1 = updateEnvContent('A=1\nB=2\n', { B: null as unknown as string })
        expect(out1).toBe('A=1\n')
        const out2 = updateEnvContent('A=1\nB=2\n', { B: undefined })
        expect(out2).toBe('A=1\n')
    })

    it('drops legacy "undefined=..." lines while preserving valid ones', () => {
        const out = updateEnvContent('FOO=keep\nundefined=garbage\n', { NEW: 'x' })
        expect(out).toBe('FOO=keep\nNEW=x\n')
    })

    it('preserves comments and blank lines', () => {
        const input = '# llm\nOPENAI_API_KEY=sk-old\n\n# tg\nTG_TOKEN=t\n'
        const out = updateEnvContent(input, { OPENAI_API_KEY: 'sk-new' })
        expect(out).toBe('# llm\nOPENAI_API_KEY=sk-new\n\n# tg\nTG_TOKEN=t\n')
    })

    it('is idempotent when called with no overrides', () => {
        const input = '# header\n\nFOO=bar\n# trailer\nBAZ="quoted value"\n'
        const once = updateEnvContent(input, {})
        const twice = updateEnvContent(once, {})
        expect(once).toBe(twice)
        expect(once).toContain('# header')
        expect(once).toContain('# trailer')
    })

    it('quotes multiline values and round-trips stably', () => {
        const pem = '-----BEGIN KEY-----\nline2\n-----END KEY-----'
        const first = updateEnvContent('', { PEM: pem })
        expect(first.split('\n')).toHaveLength(2)
        expect(first.startsWith('PEM="')).toBe(true)
        const second = updateEnvContent(first, {})
        expect(second).toBe(first)
    })

    it('does not re-escape already-quoted values on repeated saves', () => {
        const first = updateEnvContent('', { K: 'a"b\\c\nd' })
        const second = updateEnvContent(first, { OTHER: '1' })
        const third = updateEnvContent(second, { OTHER: '2' })
        const encoded = (s: string) => s.match(/^K=(.*)$/m)![1]
        expect(encoded(first)).toBe(encoded(second))
        expect(encoded(second)).toBe(encoded(third))
    })

    it('strips inline comments from unquoted values on read', () => {
        const out = updateEnvContent('API=abc # rotate 2026-01-01\n', { NEW: 'x' })
        expect(out).toBe('API=abc\nNEW=x\n')
    })

    it('preserves "#" inside quoted values across a round trip', () => {
        const once = updateEnvContent('', { URL: 'https://x.example/#anchor' })
        const twice = updateEnvContent(once, {})
        expect(twice).toBe(once)
        expect(once).toContain('URL="https://x.example/#anchor"')
    })

    it('deduplicates repeated keys in the source, keeping the first occurrence', () => {
        const out = updateEnvContent('FOO=first\nFOO=second\nBAR=x\n', { BAR: 'y' })
        expect(out).toBe('FOO=first\nBAR=y\n')
    })

    it('keeps prefix-overlapping keys independent (MY_KEY vs MY_KEY_FOO)', () => {
        const out = updateEnvContent('MY_KEY=a\n', { MY_KEY_FOO: 'b' })
        expect(out).toBe('MY_KEY=a\nMY_KEY_FOO=b\n')
    })

    it('writes empty string values and filters null/undefined entries', () => {
        const out = updateEnvContent('', {
            EMPTY: '',
            NULLISH: null as unknown as string,
            UNDEF: undefined,
            OK: 'x',
        })
        expect(out).toBe('EMPTY=\nOK=x\n')
    })

    it('normalises trailing newlines (adds missing, avoids duplicates)', () => {
        expect(updateEnvContent('FOO=bar', { BAZ: 'qux' })).toBe('FOO=bar\nBAZ=qux\n')
        expect(updateEnvContent('FOO=1\n\n', { BAR: '2' })).toBe('FOO=1\n\nBAR=2\n')
    })

    it('returns an empty string when there are no segments', () => {
        expect(updateEnvContent('', {})).toBe('')
    })
})

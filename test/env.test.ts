import { describe, it, expect } from 'vitest'
import { parseEnvContent } from '../src/shmastra/env'

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
        // base64-like value with trailing equals
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

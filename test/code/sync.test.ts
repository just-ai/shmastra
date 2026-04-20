import { describe, it, expect } from 'vitest'
import {
    parseGitignoreContent,
    matchesGitignorePattern,
    isGitignored,
} from '../../src/shmastra/code/sync'

describe('parseGitignoreContent', () => {
    it('strips empty lines and comments', () => {
        const input = '# comment\nnode_modules\n\n*.log\n   \n# trailing'
        expect(parseGitignoreContent(input)).toEqual(['node_modules', '*.log'])
    })

    it('trims whitespace from every line', () => {
        expect(parseGitignoreContent('  foo  \n\tbar\t')).toEqual(['foo', 'bar'])
    })

    it('returns empty array for empty input', () => {
        expect(parseGitignoreContent('')).toEqual([])
    })

    it('returns empty array for comments-only input', () => {
        expect(parseGitignoreContent('# only\n# comments')).toEqual([])
    })
})

describe('matchesGitignorePattern', () => {
    it('matches exact filename via basename', () => {
        expect(matchesGitignorePattern('src/app.log', '*.log')).toBe(true)
        expect(matchesGitignorePattern('src/app.txt', '*.log')).toBe(false)
    })

    it('matches directory pattern with trailing slash', () => {
        expect(matchesGitignorePattern('node_modules', 'node_modules/')).toBe(true)
        expect(matchesGitignorePattern('node_modules/foo/bar', 'node_modules/')).toBe(true)
    })

    it('matches "**" as recursive wildcard across directories', () => {
        expect(matchesGitignorePattern('a/b/dist', '**/dist')).toBe(true)
        expect(matchesGitignorePattern('a/dist', '**/dist')).toBe(true)
    })

    it('matches anchored pattern at any path depth', () => {
        expect(matchesGitignorePattern('pkg/sub/file.log', '*.log')).toBe(true)
    })

    it('does not match unrelated paths', () => {
        expect(matchesGitignorePattern('src/app.ts', 'node_modules')).toBe(false)
    })

    it('matches single-char wildcard "?"', () => {
        expect(matchesGitignorePattern('a.c', 'a.?')).toBe(true)
        expect(matchesGitignorePattern('a.cpp', 'a.?')).toBe(false)
    })
})

describe('isGitignored', () => {
    it('returns true when any pattern matches', () => {
        expect(isGitignored('src/debug.log', ['*.log', 'node_modules'])).toBe(true)
    })

    it('returns false when no patterns match', () => {
        expect(isGitignored('src/app.ts', ['*.log', 'dist'])).toBe(false)
    })

    it('short-circuits — the top-level ALWAYS_KEEP entries are never gitignored', () => {
        // node_modules is in ALWAYS_KEEP, so even a matching pattern must not flag it
        expect(isGitignored('node_modules/foo/bar', ['node_modules'])).toBe(false)
    })

    it('treats .env as always-kept', () => {
        expect(isGitignored('.env', ['.env'])).toBe(false)
    })

    it('treats test/ as always-kept (sync exclusion)', () => {
        expect(isGitignored('test/utils.test.ts', ['test'])).toBe(false)
    })

    it('treats vitest.config.ts as always-kept', () => {
        expect(isGitignored('vitest.config.ts', ['vitest.config.ts'])).toBe(false)
    })

    it('treats .husky/ as always-kept (sync exclusion)', () => {
        expect(isGitignored('.husky/pre-commit', ['.husky'])).toBe(false)
    })

    it('returns false for empty pattern list', () => {
        expect(isGitignored('any/path.ts', [])).toBe(false)
    })
})

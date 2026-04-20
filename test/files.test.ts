import { describe, it, expect, vi } from 'vitest'
import * as path from 'node:path'

vi.mock('nanoid', () => ({
    nanoid: (_size: number) => 'TESTID01',
}))

const {
    createUniqueFileName,
    getLocalFileUrl,
    getLocalFilePath,
} = await import('../src/shmastra/files')

describe('createUniqueFileName', () => {
    it('preserves extension', () => {
        expect(createUniqueFileName('report.pdf')).toBe('report-TESTID01.pdf')
    })

    it('transliterates non-ASCII basenames via any-ascii', () => {
        const result = createUniqueFileName('Привет.pdf')
        expect(result).toMatch(/^[\x20-\x7e]+\.pdf$/)
        expect(result.endsWith('-TESTID01.pdf')).toBe(true)
    })

    it('handles extensionless file names', () => {
        expect(createUniqueFileName('README')).toBe('README-TESTID01')
    })

    it('preserves multi-dot filenames (uses last extension)', () => {
        expect(createUniqueFileName('archive.tar.gz')).toBe('archive.tar-TESTID01.gz')
    })
})

describe('getLocalFileUrl', () => {
    it('returns the api file path', () => {
        expect(getLocalFileUrl('foo.pdf')).toBe('/shmastra/api/files/foo.pdf')
    })

    it('handles filenames with spaces untouched', () => {
        expect(getLocalFileUrl('a b.png')).toBe('/shmastra/api/files/a b.png')
    })
})

describe('getLocalFilePath', () => {
    it('joins cwd with files/ and the filename', () => {
        expect(getLocalFilePath('foo.pdf')).toBe(path.join(process.cwd(), 'files', 'foo.pdf'))
    })
})

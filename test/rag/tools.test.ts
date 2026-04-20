import { describe, it, expect } from 'vitest'
import {
    getFileExtension,
    isImageFile,
    assertSupportedFile,
} from '../../src/shmastra/rag/tools'

describe('getFileExtension', () => {
    it('returns the lowercased extension', () => {
        expect(getFileExtension('file.PDF')).toBe('pdf')
        expect(getFileExtension('photo.JPEG')).toBe('jpeg')
    })

    it('returns last extension for multi-dot filenames', () => {
        expect(getFileExtension('archive.tar.gz')).toBe('gz')
    })

    it('returns the name itself for dotfiles (no extension)', () => {
        // .gitignore -> split('.') -> ['', 'gitignore'], pop() -> 'gitignore'
        expect(getFileExtension('.gitignore')).toBe('gitignore')
    })

    it('returns the whole string for files without a dot', () => {
        expect(getFileExtension('README')).toBe('readme')
    })
})

describe('isImageFile', () => {
    it('returns true for png/jpg/jpeg', () => {
        expect(isImageFile('a.png')).toBe(true)
        expect(isImageFile('a.jpg')).toBe(true)
        expect(isImageFile('a.jpeg')).toBe(true)
    })

    it('is case-insensitive', () => {
        expect(isImageFile('a.PNG')).toBe(true)
    })

    it('returns false for documents', () => {
        expect(isImageFile('doc.pdf')).toBe(false)
        expect(isImageFile('notes.txt')).toBe(false)
    })

    it('returns false for unsupported image formats (webp, gif)', () => {
        expect(isImageFile('a.webp')).toBe(false)
        expect(isImageFile('a.gif')).toBe(false)
    })
})

describe('assertSupportedFile', () => {
    it('does not throw for supported extensions', () => {
        expect(() => assertSupportedFile('a.pdf')).not.toThrow()
        expect(() => assertSupportedFile('a.png')).not.toThrow()
        expect(() => assertSupportedFile('a.docx')).not.toThrow()
        expect(() => assertSupportedFile('a.html')).not.toThrow()
    })

    it('throws with informative message for unsupported extension', () => {
        expect(() => assertSupportedFile('a.exe')).toThrow(/Unsupported file extension/)
        expect(() => assertSupportedFile('a.exe')).toThrow(/Supported extensions:/)
    })

    it('error message includes the offending filename', () => {
        expect(() => assertSupportedFile('virus.bin')).toThrow(/virus\.bin/)
    })
})

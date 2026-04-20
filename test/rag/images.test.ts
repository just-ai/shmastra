import { describe, it, expect } from 'vitest'
import { getImageDimensions, MIN_IMAGE_SIZE } from '../../src/shmastra/rag/images'

function makePng(width: number, height: number): Buffer {
    const buf = Buffer.alloc(24)
    buf[0] = 0x89
    buf[1] = 0x50
    buf[2] = 0x4e
    buf[3] = 0x47
    buf[4] = 0x0d
    buf[5] = 0x0a
    buf[6] = 0x1a
    buf[7] = 0x0a
    buf.writeUInt32BE(width, 16)
    buf.writeUInt32BE(height, 20)
    return buf
}

function makeJpegSimple(width: number, height: number): Buffer {
    const buf = Buffer.alloc(11)
    buf[0] = 0xff
    buf[1] = 0xd8
    buf[2] = 0xff
    buf[3] = 0xc0
    buf[4] = 0x00
    buf[5] = 0x11
    buf[6] = 0x08
    buf.writeUInt16BE(height, 7)
    buf.writeUInt16BE(width, 9)
    return buf
}

function makeJpegWithApp0(width: number, height: number): Buffer {
    const buf = Buffer.alloc(31)
    buf[0] = 0xff
    buf[1] = 0xd8
    // APP0 segment — 16 bytes total (incl. length field)
    buf[2] = 0xff
    buf[3] = 0xe0
    buf.writeUInt16BE(16, 4)
    // SOF0 starts at offset 20
    buf[20] = 0xff
    buf[21] = 0xc0
    buf[22] = 0x00
    buf[23] = 0x11
    buf[24] = 0x08
    buf.writeUInt16BE(height, 25)
    buf.writeUInt16BE(width, 27)
    return buf
}

function makeWebp(width: number, height: number): Buffer {
    const buf = Buffer.alloc(30)
    buf.write('RIFF', 0)
    buf.write('WEBP', 8)
    buf.write('VP8 ', 12)
    buf.writeUInt16LE(width & 0x3fff, 26)
    buf.writeUInt16LE(height & 0x3fff, 28)
    return buf
}

describe('getImageDimensions', () => {
    it('parses PNG dimensions', () => {
        expect(getImageDimensions(makePng(1024, 768), 'png')).toEqual({ width: 1024, height: 768 })
    })

    it('returns null for PNG without valid signature', () => {
        const buf = Buffer.alloc(24)
        expect(getImageDimensions(buf, 'png')).toBeNull()
    })

    it('parses JPEG SOF0 marker directly after SOI', () => {
        expect(getImageDimensions(makeJpegSimple(640, 480), 'jpeg')).toEqual({ width: 640, height: 480 })
    })

    it('accepts both "jpeg" and "jpg" extensions', () => {
        expect(getImageDimensions(makeJpegSimple(100, 50), 'jpg')).toEqual({ width: 100, height: 50 })
    })

    it('skips APP0 segment before SOF0', () => {
        expect(getImageDimensions(makeJpegWithApp0(800, 600), 'jpeg')).toEqual({ width: 800, height: 600 })
    })

    it('parses WebP dimensions with 14-bit mask', () => {
        expect(getImageDimensions(makeWebp(1920, 1080), 'webp')).toEqual({ width: 1920, height: 1080 })
    })

    it('masks WebP dimensions to 14 bits', () => {
        const buf = Buffer.alloc(30)
        buf.write('RIFF', 0)
        buf.write('WEBP', 8)
        // 0xFFFF & 0x3fff = 0x3fff = 16383
        buf.writeUInt16LE(0xffff, 26)
        buf.writeUInt16LE(0xffff, 28)
        expect(getImageDimensions(buf, 'webp')).toEqual({ width: 0x3fff, height: 0x3fff })
    })

    it('returns null for unsupported extensions', () => {
        expect(getImageDimensions(makePng(10, 10), 'gif')).toBeNull()
        expect(getImageDimensions(Buffer.alloc(100), 'bmp')).toBeNull()
    })

    it('returns null for truncated PNG buffers', () => {
        const truncated = Buffer.from([0x89, 0x50, 0x4e])
        expect(getImageDimensions(truncated, 'png')).toBeNull()
    })

    it('returns null for WebP without RIFF signature', () => {
        const buf = Buffer.alloc(30)
        buf.write('XXXX', 0)
        expect(getImageDimensions(buf, 'webp')).toBeNull()
    })

    it('exposes MIN_IMAGE_SIZE = 64', () => {
        expect(MIN_IMAGE_SIZE).toBe(64)
    })
})

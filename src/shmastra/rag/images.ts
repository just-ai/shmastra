export const MIN_IMAGE_SIZE = 64;

export function getImageDimensions(buf: Buffer, ext: string): {width: number; height: number} | null {
    try {
        if (ext === "png" && buf[0] === 0x89 && buf[1] === 0x50) {
            return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
        }
        if (ext === "jpeg" || ext === "jpg") {
            let i = 2;
            while (i < buf.length) {
                if (buf[i] !== 0xff) break;
                const marker = buf[i + 1];
                if (marker >= 0xc0 && marker <= 0xc3) {
                    return {width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5)};
                }
                i += 2 + buf.readUInt16BE(i + 2);
            }
        }
        if (ext === "webp" && buf.slice(0, 4).toString() === "RIFF") {
            return {width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff};
        }
    } catch {
        // ignore malformed headers
    }
    return null;
}

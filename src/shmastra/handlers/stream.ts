import {resolveFileUrl} from "../files";
import {getMastra} from "../utils";
import {Middleware} from "../../mastra/middleware";

const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

let _streamPattern: RegExp | undefined;
async function getStreamPattern() {
    if (!_streamPattern) {
        const mastra = await getMastra();
        const prefix = mastra.getServer()?.apiPrefix || "/api";
        _streamPattern = new RegExp(`^${prefix}/agents/[^/]+/stream(-until-idle)?$`);
    }
    return _streamPattern;
}

export const handleStream: Middleware = async (c, next) => {
    const pattern = await getStreamPattern();
    if (c.req.method === 'POST' && pattern.test(c.req.path)) {
        const body = await c.req.json()

        if (Array.isArray(body.messages)) {
            for (const m of body.messages) {
                if (!Array.isArray(m.content)) continue
                const kept: any[] = []
                const attachmentTags: string[] = []
                for (const p of m.content) {
                    if (p.type !== 'image' || (p.mimeType && ALLOWED_IMAGE_TYPES.has(p.mimeType))) {
                        kept.push(p)
                        continue
                    }
                    const name = typeof p.image === 'string' ? p.image.split('/').pop() : ''
                    if (name) attachmentTags.push(`<attachment name=${name}>\n\n</attachment>`)
                }
                if (!attachmentTags.length) {
                    m.content = kept
                } else if (!kept.length) {
                    m.content = attachmentTags.join('\n')
                } else {
                    m.content = [...kept, { type: 'text', text: attachmentTags.join('\n') }]
                }
            }

            const imageParts = body.messages
                .flatMap((m: any) => Array.isArray(m.content) ? m.content : [])
                .filter((p: any) => p.type === 'image' && typeof p.image === 'string')

            await Promise.all(imageParts.map(async (part: any) => {
                part.image = await resolveFileUrl(part.image, part.mimeType ?? 'image/png')
            }))
        }

        const modifiedRequest = new Request(c.req.raw, {
            body: JSON.stringify(body),
        })
        Object.defineProperty(c.req, 'raw', { value: modifiedRequest, writable: true, configurable: true })
    }
    await next()
}

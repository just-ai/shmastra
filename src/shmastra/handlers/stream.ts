import {resolveFileUrl} from "../files";
import {getMastra} from "../utils";
import {Middleware} from "../../mastra/middleware";

let _streamPattern: RegExp | undefined;
async function getStreamPattern() {
    if (!_streamPattern) {
        const mastra = await getMastra();
        const prefix = mastra.getServer()?.apiPrefix || "/api";
        _streamPattern = new RegExp(`^${prefix}/agents/[^/]+/stream$`);
    }
    return _streamPattern;
}

export const handleStream: Middleware = async (c, next) => {
    const pattern = await getStreamPattern();
    if (c.req.method === 'POST' && pattern.test(c.req.path)) {
        const body = await c.req.json()

        if (Array.isArray(body.messages)) {
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

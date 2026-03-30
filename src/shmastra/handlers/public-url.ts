import {Middleware} from "../../mastra/middleware";

export const detectPublicUrl: Middleware = async (c, next) => {
    if (!process.env.PUBLIC_URL) {
        const proto = c.req.header('x-forwarded-proto') || (new URL(c.req.url).protocol.replace(':', ''));

        if (proto === 'https') {
            const host = c.req.header('x-forwarded-host') || c.req.header('host') || '';
            const hostname = host.split(':')[0];
            const isLocal = hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || /^\[?[:0-9a-f]+]?$/i.test(hostname);

            if (host && !isLocal) {
                process.env.PUBLIC_URL = `https://${host}`;
            }
        }
    }
    await next();
}

import {Middleware} from "../../mastra/middleware";
import {getMastra} from "../utils";
import {isDevMode} from "../env";

const studioPaths = [
    '/agents', '/tools', '/workflows', '/processors', '/mcps',
    '/scorers', '/workspaces', '/request-context', '/observability',
    '/datasets', '/settings',
];

let _studioBase: string | undefined;
async function isStudioPath(path: string) {
    if (_studioBase === undefined) {
        const mastra = await getMastra();
        _studioBase = (mastra.getServer()?.studioBase || "/").replace(/\/+$/, '');
    }
    return path === (_studioBase || "/") || studioPaths.some(p => path === p || path.startsWith(`${_studioBase}${p}`));
}

function jsString(value: string): string {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}

export const injectScript: Middleware = async (c, next) => {
    await next()
    if (isDevMode && c.req.method === 'GET' && await isStudioPath(c.req.path) && c.res.headers.get('content-type')?.includes('text/html')) {
        const html = await c.res.text()
        const token = process.env.MASTRA_AUTH_TOKEN ?? ""
        const globals = `<script>window.MASTRA_AUTH_TOKEN=${jsString(token)};</script>`
        const modified = html
            .replace('<head>', `<head>${globals}`)
            .replace('</body>', '<script src="/shmastra/public/script/shmastra.js"></script></body>')
        c.res = new Response(modified, c.res)
    }
}

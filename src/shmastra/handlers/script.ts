import {Middleware} from "../../mastra/middleware";

const studioPaths = [
    '/',
    '/agents', '/tools', '/workflows', '/processors', '/mcps',
    '/scorers', '/workspaces', '/request-context', '/observability',
    '/datasets', '/settings',
];

function isStudioPath(path: string): boolean {
    return studioPaths.some(p => path === p || path.includes(p + '/'));
}

export const injectScript: Middleware = async (c, next) => {
    await next()
    if (c.req.method === 'GET' && isStudioPath(c.req.path) && c.res.headers.get('content-type')?.includes('text/html')) {
        const html = await c.res.text()
        const modified = html.replace('</body>', '<script src="/shmastra/public/script/shmastra.js"></script></body>')
        c.res = new Response(modified, c.res)
    }
}

import {ShmastraCode} from "../code";
import connections from "../connections";
import {Handler} from "hono";

export const toolkitAuthLinkHandler: Handler = async c => {
    const toolkit = c.req.param('toolkit') || "";
    const url = new URL(c.req.url);
    url.pathname = "/shmastra/public/auth.html";
    url.search = "";
    return c.json(await connections.authorizeToolkit(toolkit, url.toString()));
}

export const toolkitAuthHandler = (code: ShmastraCode): Handler => async c => {
    const toolkit = c.req.param('toolkit') || "";
    code.harness.completeConnectionAuth(toolkit);
    return c.body(null, 204);
}
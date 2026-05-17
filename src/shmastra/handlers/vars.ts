import {ShmastraCode} from "../code";
import {Handler} from "hono";

export const envVarsHandler = (code: ShmastraCode): Handler => async c => {
    const vars = await c.req.json();
    await code.harness.respondToToolSuspension({ resumeData: { vars } });
    return c.body(null, 204);
}

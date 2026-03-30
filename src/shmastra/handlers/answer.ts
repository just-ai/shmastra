import {ShmastraCode} from "../code";
import {Handler} from "hono";

export const answerHandler = (code: ShmastraCode): Handler => async c => {
    const { answer } = await c.req.json();
    code.harness.answerQuestion({ answer });
    return c.body(null, 204);
}
import {Handler} from "hono";

export const healthHandler: Handler = async c =>
    c.body(null, 200)

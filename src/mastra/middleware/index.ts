import type {MiddlewareHandler} from "hono";

export type Middleware = MiddlewareHandler | { path: string; handler: MiddlewareHandler };

/**
 * Custom middlewares for mastra server
 */
export const middleware: Middleware[] = [];
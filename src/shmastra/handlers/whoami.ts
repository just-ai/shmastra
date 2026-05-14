import {Handler} from "hono";
import {sessionAls} from "../auth";

// Lets the client ask "who am I, on this token?" — used by shmastra.js on
// app pages to decide whether to load the coding widget (owner-only).
// When MASTRA_AUTH_TOKEN env is unset (standalone dev), no auth provider
// runs and the ALS store is empty: treat that as owner so the widget keeps
// working in single-user dev. Otherwise the role comes from ShmastraAuth,
// and `authorizeUser` already denies guests every `/shmastra/api/*` route
// besides files — so a guest never even reaches this handler.
export const whoamiHandler: Handler = c => {
    const user = sessionAls.getStore();
    return c.json({role: user?.role ?? "owner"});
};

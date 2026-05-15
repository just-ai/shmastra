import type {ServerRoute} from "@mastra/server/server-adapter";
import {SERVER_ROUTES, getEffectivePermission} from "@mastra/server/server-adapter";
import {pathMatchesPattern} from "@mastra/server/auth";
import type {MiddlewareHandler} from "hono";
import {sessionAls, type UserSession} from "./auth";

// What a guest is allowed to do: run agents and workflows, fetch their
// metadata, read run/chat history. Everything else under the Mastra API
// (observability, logs, scores, vector stores, mcp, processors, datasets,
// agent-builder, system, etc.) is owner-only — those endpoints expose
// telemetry and management surfaces that have nothing to do with the
// shared app.
const GUEST_PERMISSIONS: readonly string[] = [
  "agents:read",
  "agents:execute",
  "workflows:read",
  "workflows:execute",
  "memory:read",
];

const ROLE_PERMISSIONS: Record<UserSession["role"], readonly string[]> = {
  owner: ["*"],
  guest: GUEST_PERMISSIONS,
};

// Wildcard match: "agents:*" matches "agents:execute", "*:read" matches
// "agents:read", "*" matches everything. Re-implemented here instead of
// importing from @mastra/core/auth/ee/defaults/roles so we stay clear of
// the EE-licensed namespace.
function matchesPermission(granted: string, required: string): boolean {
  if (granted === "*") return true;
  const [gr, ga] = granted.split(":");
  const [rr, ra] = required.split(":");
  return (gr === "*" || gr === rr) && (ga === "*" || ga === ra);
}

// Index SERVER_ROUTES by `${METHOD} ${first-path-segment}` so route
// lookup per request is one Map.get + a tiny in-bucket scan, not a full
// 150-route linear walk.
const ROUTE_BUCKETS = new Map<string, ServerRoute[]>();
for (const route of SERVER_ROUTES) {
  const firstSegment = route.path.split("/")[1] ?? "";
  const key = `${route.method} ${firstSegment}`;
  const bucket = ROUTE_BUCKETS.get(key);
  if (bucket) bucket.push(route);
  else ROUTE_BUCKETS.set(key, [route]);
}

function findRoute(method: string, pathname: string): ServerRoute | undefined {
  const firstSegment = pathname.split("/")[1] ?? "";
  const candidates = ROUTE_BUCKETS.get(`${method} ${firstSegment}`);
  return candidates?.find(r => pathMatchesPattern(pathname, r.path));
}

/**
 * Hono middleware that gates Mastra-core API routes by the role on the
 * current session. Mirrors what `server.rbac` would do, but driven by
 * our own user objects and our own permission table — Mastra's
 * `requiresPermission` annotations on each `SERVER_ROUTES` entry are
 * the source of truth for what each endpoint needs.
 *
 * Only Mastra-core routes are gated (`/<apiPrefix>/...`). Our own
 * `/shmastra/api/*` routes aren't in `SERVER_ROUTES` and are guarded
 * separately by `ShmastraAuth.authorizeUser`.
 */
export const routePermissionsMiddleware =
  (apiPrefix: string): MiddlewareHandler =>
  async (c, next) => {
    const user = sessionAls.getStore();
    if (!user || user.role === "owner") return next();

    const pathname = new URL(c.req.url).pathname;
    if (!pathname.startsWith(apiPrefix)) return next();
    const corePath = pathname.slice(apiPrefix.length) || "/";

    const route = findRoute(c.req.method, corePath);
    if (!route) return next();

    const required = getEffectivePermission(route);
    if (!required) return next();

    const granted = ROLE_PERMISSIONS[user.role];
    if (granted.some(p => matchesPermission(p, required))) return next();

    return c.json({error: `Forbidden: missing permission ${required}`}, 403);
  };

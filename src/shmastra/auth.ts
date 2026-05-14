import { AsyncLocalStorage } from "node:async_hooks";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { HonoRequest, MiddlewareHandler } from "hono";
import { MastraAuthProvider } from "@mastra/core/server";
import { findProjectRoot } from "./files";

const SESSIONS_DIR = path.resolve(findProjectRoot(), ".sessions");

/**
 * Per-request user context. Always carries `userId`. For guests it additionally
 * carries the share-session metadata loaded from `.sessions/<token>.json`; for
 * the sandbox owner only `userId` is meaningful (sourced from `USER_ID` env).
 *
 * Used both as the value Mastra's auth middleware passes to authorizeUser and
 * as the AsyncLocalStorage payload read by the LLM gateway for per-request
 * attribution headers.
 */
export type UserSession =
  | { role: "owner"; userId: string }
  | { role: "guest"; userId: string; sessionId: string; sessionKey: string; referrer: string };

// Parse-cache keyed by token. Session files are write-once (created at session
// start, deleted when the share is revoked / expires), so a cheap fs.access on
// each request is enough to keep the cache truthful — if the file still exists,
// the cached parse is still valid; if it's gone, drop the entry. This avoids
// re-reading and re-parsing JSON on every authenticated call without ever
// serving a session that's been revoked on disk.
const cache = new Map<string, UserSession>();

async function sessionFileExists(token: string): Promise<boolean> {
  try {
    await access(path.join(SESSIONS_DIR, `${token}.json`));
    return true;
  } catch {
    return false;
  }
}

// AsyncLocalStorage holding the current authenticated user for the lifetime of
// a single HTTP request. Read by src/shmastra/gateway.ts to stamp outgoing LLM
// calls with `x-shmastra-user-id` / `x-shmastra-session-key` so the cloud can
// attribute usage to the actual viewer (or to the owner for non-guest calls).
export const sessionAls = new AsyncLocalStorage<UserSession>();

export function getCurrentUserSession(): UserSession | undefined {
  return sessionAls.getStore();
}

async function readUserSession(token: string): Promise<UserSession | null> {
  // Filename = token (e.g. `st_abc.json`). Reject anything containing path
  // separators so a hostile header value can't escape the sessions dir.
  if (!token || /[\/\\\0]/.test(token)) return null;
  const file = path.join(SESSIONS_DIR, `${token}.json`);
  try {
    const text = await readFile(file, "utf8");
    const data = JSON.parse(text);
    if (
      typeof data?.sessionId !== "string" ||
      typeof data?.sessionKey !== "string" ||
      typeof data?.userId !== "string" ||
      typeof data?.referrer !== "string"
    ) {
      return null;
    }
    return {
      role: "guest",
      userId: data.userId,
      sessionId: data.sessionId,
      sessionKey: data.sessionKey,
      referrer: data.referrer,
    };
  } catch {
    return null;
  }
}

async function resolveUser(token: string, ownerToken: string | undefined): Promise<UserSession | null> {
  if (ownerToken && token === ownerToken) {
    return { role: "owner", userId: process.env.USER_ID ?? "" };
  }
  if (!token || /[\/\\\0]/.test(token)) return null;

  const cached = cache.get(token);
  if (cached && (await sessionFileExists(token))) return cached;

  const user = await readUserSession(token);
  if (user) cache.set(token, user);
  else cache.delete(token);
  return user;
}

export interface ShmastraAuthOptions {
  ownerToken: string | undefined;
  public?: RegExp[];
}

export class ShmastraAuth extends MastraAuthProvider<UserSession> {
  // Exempts the provider from the EE license gate so Studio's /auth/capabilities
  // returns user info (and skips the "no login method" screen) for our bearer-token
  // auth — same flag Mastra's built-in SimpleAuth sets.
  readonly isSimpleAuth = true;

  private ownerToken: string | undefined;

  constructor(options: ShmastraAuthOptions) {
    super({ name: "shmastra", public: options.public });
    this.ownerToken = options.ownerToken;
  }

  async authenticateToken(token: string, _request: HonoRequest): Promise<UserSession | null> {
    return resolveUser(token, this.ownerToken);
  }

  async getCurrentUser(request: Request): Promise<{ id: string } | null> {
    const raw = request.headers.get("authorization");
    if (!raw) return null;
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    const user = await resolveUser(token, this.ownerToken);
    return user ? { id: user.userId } : null;
  }

  async authorizeUser(user: UserSession, request: HonoRequest): Promise<boolean> {
    if (user.role === "owner") return true;

    // Mastra's coreAuthMiddleware actually hands us the raw web `Request`
    // here (not a `HonoRequest`) — the abstract signature in @mastra/core
    // lies. Cast through to reach `.headers.get(...)` and `.url`.
    const req = request as unknown as Request;
    const pathname = new URL(req.url).pathname;

    // Everything under `/shmastra/api/*` is owner-tooling: the mastracode
    // coding agent (`/chat`, `/answer`, `/thread`) literally rewrites the
    // Mastra server, `/vars` edits .env, `/connection` runs Composio OAuth.
    // Guests have no business calling any of it. Carve out exceptions for
    // routes apps legitimately need:
    //   - /shmastra/api/files       — uploads/downloads for app attachments
    //   - /shmastra/api/apps/<name> — app-authored custom backend routes
    //     (skills/apps SKILL.md mandates this prefix)
    const guestApiAllowlist = ["/shmastra/api/files", "/shmastra/api/apps/"];
    if (
      pathname.startsWith("/shmastra/api/") &&
      !guestApiAllowlist.some((p) => pathname.startsWith(p))
    ) {
      return false;
    }

    // Guest may only call API endpoints reachable from their share page.
    // The browser sends `Referer: https://<cloud>/<referrer>...` for every
    // request originating from that page, so we just check the pathname
    // prefix matches the share URL we wrote into the session file.
    const referer = req.headers.get("referer");
    if (!referer) return false;
    try {
      const path = new URL(referer).pathname;
      return path === user.referrer || path.startsWith(`${user.referrer}/`);
    } catch {
      return false;
    }
  }
}

function extractToken(request: { header: (name: string) => string | undefined }): string | undefined {
  const raw = request.header("authorization");
  if (!raw) return undefined;
  return raw.replace(/^Bearer\s+/i, "").trim();
}

/**
 * Hono middleware that runs each request inside an AsyncLocalStorage scope
 * carrying the resolved user (owner or guest). The Mastra auth middleware has
 * already validated the token before this point — we just re-resolve it
 * through the same in-memory cache and stash the user for downstream code.
 */
export const sessionAlsMiddleware: MiddlewareHandler = async (c, next) => {
  const token = extractToken(c.req);
  if (!token) return next();
  const user = await resolveUser(token, process.env.MASTRA_AUTH_TOKEN);
  if (!user) return next();
  return sessionAls.run(user, () => next());
};

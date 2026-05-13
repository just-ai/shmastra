import { AsyncLocalStorage } from "node:async_hooks";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { HonoRequest, MiddlewareHandler } from "hono";
import { MastraAuthProvider } from "@mastra/core/server";

const SESSIONS_DIR = path.resolve(process.cwd(), ".sessions");
const CACHE_TTL_MS = 30_000;

export interface GuestSession {
  sessionId: string;
  sessionVk: string;
  viewerUserId: string;
  referrer: string;
}

export type ShmastraUser =
  | { role: "owner" }
  | ({ role: "guest" } & GuestSession);

interface CacheEntry {
  user: ShmastraUser | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// AsyncLocalStorage holding the current guest session (if any) for the
// lifetime of a single HTTP request. Read by src/shmastra/gateway.ts to
// rewrite outgoing LLM calls so they bear the session VK instead of the
// sandbox-wide owner VK — this lets cloud attribute usage to the session
// even though the owner is still billed.
export const sessionAls = new AsyncLocalStorage<GuestSession>();

export function getCurrentGuestSession(): GuestSession | undefined {
  return sessionAls.getStore();
}

async function readSessionFile(token: string): Promise<GuestSession | null> {
  // Filename = token (e.g. `st_abc.json`). Reject anything containing path
  // separators so a hostile header value can't escape the sessions dir.
  if (!token || /[\/\\\0]/.test(token)) return null;
  const file = path.join(SESSIONS_DIR, `${token}.json`);
  try {
    const text = await readFile(file, "utf8");
    const data = JSON.parse(text);
    if (
      typeof data?.sessionId !== "string" ||
      typeof data?.sessionVk !== "string" ||
      typeof data?.viewerUserId !== "string" ||
      typeof data?.referrer !== "string"
    ) {
      return null;
    }
    return data as GuestSession;
  } catch {
    return null;
  }
}

async function resolveUser(token: string, ownerToken: string | undefined): Promise<ShmastraUser | null> {
  if (ownerToken && token === ownerToken) return { role: "owner" };

  const now = Date.now();
  const cached = cache.get(token);
  if (cached && cached.expiresAt > now) return cached.user;

  const session = await readSessionFile(token);
  const user: ShmastraUser | null = session ? { role: "guest", ...session } : null;
  cache.set(token, { user, expiresAt: now + CACHE_TTL_MS });
  return user;
}

export interface ShmastraAuthOptions {
  ownerToken: string | undefined;
  public?: RegExp[];
}

export class ShmastraAuth extends MastraAuthProvider<ShmastraUser> {
  private ownerToken: string | undefined;

  constructor(options: ShmastraAuthOptions) {
    super({ name: "shmastra", public: options.public });
    this.ownerToken = options.ownerToken;
  }

  async authenticateToken(token: string, _request: HonoRequest): Promise<ShmastraUser | null> {
    return resolveUser(token, this.ownerToken);
  }

  async authorizeUser(user: ShmastraUser, request: HonoRequest): Promise<boolean> {
    if (user.role === "owner") return true;

    // Guest may only call API endpoints reachable from their share page.
    // The browser sends `Referer: https://<cloud>/<referrer>...` for every
    // request originating from that page, so we just check the pathname
    // prefix matches the share URL we wrote into the session file.
    const referer = request.header("referer") ?? request.header("Referer");
    if (!referer) return false;
    try {
      const path = new URL(referer).pathname;
      return path === user.referrer || path.startsWith(`${user.referrer}/`);
    } catch {
      return false;
    }
  }
}

const AUTH_HEADERS = ["x-mastra-auth-token", "authorization"];

function extractToken(request: { header: (name: string) => string | undefined }): string | undefined {
  for (const name of AUTH_HEADERS) {
    const raw = request.header(name);
    if (!raw) continue;
    return raw.replace(/^Bearer\s+/i, "").trim();
  }
  return undefined;
}

/**
 * Hono middleware that runs each request inside an AsyncLocalStorage scope
 * carrying the guest session (if any). The Mastra auth middleware has already
 * validated the token before this point — we just re-resolve it through the
 * same in-memory cache and stash the session for downstream code.
 */
export const sessionAlsMiddleware: MiddlewareHandler = async (c, next) => {
  const token = extractToken(c.req);
  if (!token) return next();
  const ownerToken = process.env.MASTRA_AUTH_TOKEN;
  const user = await resolveUser(token, ownerToken);
  if (user?.role === "guest") {
    const { sessionId, sessionVk, viewerUserId, referrer } = user;
    return sessionAls.run({ sessionId, sessionVk, viewerUserId, referrer }, () => next());
  }
  return next();
};

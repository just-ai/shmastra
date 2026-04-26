# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Shmastra

Shmastra is a conversational AI agent builder on top of [Mastra](https://mastra.ai). Users describe agents, workflows, and integrations in natural language via Mastra Studio chat. Shmastra generates TypeScript code, validates it with dry-run builds, and hot-reloads changes — all without leaving the browser.

This project is a Mastra template. It brings interactive chat widget inside standard Mastra Studio, injecting scripts using middleware.
Shmastra uses mastracode to operate over Mastra project files, build and apply changes.

## Commands

```shell
npm run dev            # Start dev server (mastra dev) on port 4111
npm run build          # Production build (mastra build)
npm run start          # Start production server (mastra start)
npm run init-workdir   # Initialize working directory (npx tsx scripts/init-workdir.ts)
npm run install-browsers # Install Chromium Headless Shell for Playwright
npm test               # Run unit tests (Vitest, pure helpers)
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report into coverage/
```

Unit tests live under `test/` and mirror `src/shmastra/` (e.g. `test/code/sync.test.ts`). They cover pure helpers only (parsers, validators, fallback logic) — no LLM, subprocess, or heavy fs I/O. The `test/` directory, `vitest.config.ts`, and `.husky/` are excluded from the workdir sync via `SKIP_COPY` in `src/shmastra/code/sync.ts`.

A Husky `pre-push` hook runs `npm test` before every push; the same suite runs in GitHub Actions (`.github/workflows/test.yml`) on push and pull requests.

## Architecture

### Entry point

`src/mastra/index.ts` — calls `createMastra()` from `src/shmastra/mastra.ts`. Do not modify this file directly. It imports auto-discovered registries (agents, workflows, scorers) and wires them with storage, logger, observability, routes, and middleware.

### Core layers

### MCP scheduler integration (cloud-only)

When deployed under Shmastra Cloud, the hosting layer injects
`/home/user/.mastracode/mcp.json` into the sandbox. That file points
mastracode at the cloud's `/api/mcp` endpoint with a virtual-key bearer
token, exposing scheduler tools (`list_schedules`, `create_schedule`,
`update_schedule`, `delete_schedule`, `list_runs`) to the coding agent.

The file is **not** part of this template and must not be committed here.
If running shmastra standalone, the scheduler tools are simply unavailable.

- **`src/shmastra/`** — all Shmastra-specific logic:
  - `mastra.ts` — Mastra factory: runs wizard in dev mode, injects server config, patches agent streams for message deduplication
  - `handlers/` — Hono HTTP handlers (chat, files, threads, OAuth/Composio, env vars, streaming, apps serving, public URL detection)
  - `code/` — mastracode harness for sandboxed code generation. Uses subagent pattern for Mastra client operations. `apply_changes` tool runs dry-run builds via `scripts/dry-run.ts`
  - `tools/` — dynamic tool creation (`createAgentTools`, web search)
  - `agents/` — built-in agents (web browser agent with native AgentBrowser)
  - `browser/` — AgentBrowser factory (headless Chromium via Mastra's native browser API)
  - `memory/` — agent memory creation
  - `rag/` — markitdown-based RAG (PDF, DOCX, HTML → text, 200k char limit)
  - `mcp/` — MCP server integration and discovery
  - `connections/` — Composio toolkit (200+ service integrations, session-based OAuth, toolkit tool execution)
  - `channels/` — multi-channel support (Telegram, Slack, Discord, etc.)
  - `client/` — Mastra client subagent with observability tools (metrics, traces, timeseries)
  - `providers.ts` — model selection by tier (fast/general/best) across OpenAI, Google, Anthropic
  - `wizard/` — interactive setup: OAuth login for providers (OpenAI, Anthropic), API key configuration, Composio setup
  - `env.ts` — .env management, package manager detection (pnpm preferred), public URL resolution

- **`src/mastra/`** — Mastra project configuration and registries:
  - `agents/`, `workflows/`, `scorers/` — auto-injected at build time by Mastra CLI
  - `storage/` — composite store: LibSQL (default) + DuckDB (observability)
  - `routes/`, `middleware/` — custom API routes and Hono middleware
  - `public/.mastracode/` — skill definitions for the coding agent in Mastra Studio
  - `public/apps/` — user-created web apps (served at `/shmastra/apps/<name>`, no build step, Preact + htm + DaisyUI via CDN)

### Request flow

HTTP request → middleware (public URL, script injection, streaming) → route handlers → mastracode harness → LLM with tools/subagents → `apply_changes` (dry-run build + hot-reload)

### Model tiers

Models are selected based on availability (API key present) with fallback order: OpenAI → Google → Anthropic.

- **fast**: gpt-5.4-nano, gemini-3.1-flash-lite, claude-haiku-4-5
- **general**: gpt-5.4-mini, gemini-3-flash, claude-sonnet-4-6
- **best**: gpt-5.4, gemini-3-pro, claude-sonnet-4-6
- **developer** (code harness): gpt-5.4, claude-opus-4-6, gemini-3.1-pro

### Storage paths

- `.storage/mastra.db` — main database (LibSQL: traces, scores, memory)
- `.storage/mastra.duckdb` — observability database (DuckDB: metrics, timeseries)
- `.storage/code.db` — code harness database
- `files/` — uploaded files with generated public URLs
- `.mastra/output/` — build output

## Key conventions

- ES modules throughout (no CommonJS)
- Zod v4 for all schema validation
- Handlers are factory functions: `handler = (code) => (c) => {...}`
- Tools created via `createTool` with `inputSchema` (Zod)
- Agent channels must be wrapped with `createAgentChannels` from `src/shmastra` — never attach raw Chat SDK adapters directly
- Agent tools must be wrapped with `createAgentTools` from `src/shmastra`
- Environment variables for agents use prefixed naming: `{AGENT_ID_SCREAMING_CASE}_{PLATFORM}_{VAR}` (e.g. `SUPPORT_AGENT_TELEGRAM_BOT_TOKEN`)
- Default port is 4111, configurable via `PORT` env var
- Package manager: auto-detects pnpm or npm (pnpm preferred)

## Environment

Requires Node >= 22.13.0. At least one LLM provider API key must be set:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`

Optional: `COMPOSIO_API_KEY`, `MASTRA_AUTH_TOKEN`, `PUBLIC_URL`, `USER_ID`, `CORS_ORIGIN`.

In dev mode, a wizard prompts for OAuth login (OpenAI/Anthropic) and missing API keys interactively.

## Docker

`docker/` contains a multi-stage Dockerfile (Node 22 + Python 3 + Playwright + markitdown) and docker-compose.yml. The compose service mounts the project, auto-installs deps, and runs `npm run dev`.

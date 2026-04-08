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
```

No test suite exists yet (`npm test` is a no-op).

## Architecture

### Entry point

`src/mastra/index.ts` — calls `createMastra()` from `src/shmastra/mastra.ts`. Do not modify this file directly. It imports auto-discovered registries (agents, workflows, scorers) and wires them with storage, logger, observability, routes, and middleware.

### Core layers

- **`src/shmastra/`** — all Shmastra-specific logic:
  - `mastra.ts` — Mastra factory: runs wizard in dev mode, injects server config, patches agent streams for message deduplication
  - `handlers/` — Hono HTTP handlers (chat, files, threads, OAuth/Composio, env vars, streaming, public URL detection)
  - `code/` — mastracode harness for sandboxed code generation. `apply_changes` tool runs dry-run builds (pattern-matches "watching for file changes" = success, 30s timeout)
  - `tools/` — dynamic tool creation (`createAgentTools`, web search)
  - `agents/` — built-in agents (web browser agent with Playwright MCP)
  - `memory/` — agent memory creation
  - `rag/` — markitdown-based RAG (PDF, DOCX, HTML → text, 200k char limit)
  - `mcp/` — MCP server integration and discovery
  - `connections/` — Composio toolkit (200+ service integrations, session-based OAuth)
  - `channels/` — multi-channel support (Telegram, Slack, Discord, etc.)
  - `client/tools/` — tools for agents to invoke other agents/workflows via Mastra client
  - `providers.ts` — model selection by tier (fast/general/best) across OpenAI, Google, Anthropic
  - `env.ts` — .env management, package manager detection (pnpm preferred), public URL resolution

- **`src/mastra/`** — Mastra project configuration and registries:
  - `agents/`, `workflows/`, `scorers/` — auto-injected at build time by Mastra CLI
  - `storage/` — LibSQL at `.storage/mastra.db`
  - `routes/`, `middleware/` — custom API routes and Hono middleware
  - `public/.mastracode/` — skill definitions for the coding agent in Mastra Studio

### Request flow

HTTP request → middleware (public URL, script injection, streaming) → route handlers → mastracode harness → LLM with tools → `apply_changes` (dry-run build + hot-reload)

### Model tiers

Models are selected based on availability (API key present) with fallback order: OpenAI → Google → Anthropic.

- **fast**: gpt-5.4-nano, gemini-3.1-flash-lite, claude-haiku-4-5
- **general**: gpt-5.4-mini, gemini-3-flash, claude-sonnet-4-6
- **best**: gpt-5.4, gemini-3-pro, claude-sonnet-4-6
- **developer** (code harness): gpt-5.4, claude-opus-4-6, gemini-3.1-pro

### Storage paths

- `.storage/mastra.db` — main database (traces, scores, memory)
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

Optional: `COMPOSIO_API_KEY`, `MASTRA_CLOUD_ACCESS_TOKEN`, `PUBLIC_URL`, `USER_ID`.

In dev mode, a wizard prompts for missing keys interactively.

## Docker

`docker/` contains a multi-stage Dockerfile (Node 22 + Python 3 + Playwright + markitdown) and docker-compose.yml. The compose service mounts the project, auto-installs deps, and runs `npm run dev`.

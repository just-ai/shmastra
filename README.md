# 🔥 Shmastra

[![Tests](https://github.com/just-ai/shmastra/actions/workflows/test.yml/badge.svg)](https://github.com/just-ai/shmastra/actions/workflows/test.yml)

> Vibe-code AI agents and workflows right inside Mastra Studio — no IDE, no config, just chat.

[Read the docs →](https://just-ai.github.io/shmastra-docs/shmastra/)

[Mastra](https://mastra.ai) is brilliant — if you write TypeScript.
Shmastra brings that power to **everyone**.

[shmastra-intro-1777487796493.webm](https://github.com/user-attachments/assets/ed10ea6a-96e9-4fdb-a94e-d33899410ed0)

## Quick start

```shell
npx create-mastra@latest --template https://github.com/just-ai/shmastra
```

_Then just follow the on-screen instructions._

## What is this?

I always wanted to build multi-agent systems and workflows by simply describing what I need in a chat.
Let the assistant find the right APIs, hook up MCP servers, connect Google Drive and whatever else — all in one click.

Mastra already lets developers do this in TypeScript with Claude Code.
But even for engineers, wiring everything together is a grind.

Shmastra lets **anyone** — engineers or not — vibe-code agents and entire workflows directly in Mastra Studio. No context-switching, no boilerplate, no setup.

## Features

- 💬 **In-browser vibe agent** — build agents and workflows without leaving Mastra Studio
- ♻️ **Self-healing builds** — creates agents & workflows, rebuilds and hot-reloads changes automatically
- 🔍 **Inspect & fix** — navigate to any agent or workflow page and ask Shmastra to debug it
- 🔌 **Auto-discover integrations** — searches and connects MCP servers or third-party services to your agents and workflows on the fly
- 📡 **Channels** — connect agents to Telegram, Slack, Discord, WhatsApp, Teams, and Email
- 🧩 **Composio Toolkits** — 200+ ready-to-use integrations (Gmail, Drive, GitHub, Notion, Stripe, and more)
- 🔑 **One-click OAuth** — authorizes you with any external service that requires OAuth
- 📁 **First-class file handling** — no base64 hacks; files are saved to disk with temporary public URLs generated when running on localhost
- 🧠 **Built-in RAG + browser** — agents get markitdown-powered RAG, a Playwright browser, and automatic web search via your chosen LLM provider
- 📱 **App builder** — generates standalone web apps for your agents and workflows, served directly from Mastra Studio
- 🔐 **Zero-key OAuth** — log in with your existing Anthropic or OpenAI subscription instead of managing API keys
- 🖼️ **Rich chat extras** — renders iframes for generated HTML, perfect for interactive charts, dashboards, or landing pages your agent creates

## Development

```shell
npm test            # Run unit tests once
npm run test:watch  # Watch mode
npm run test:cov    # Coverage report (text + HTML in coverage/)
```

# Telegram (`@chat-adapter/telegram`)

**Docs:** https://chat-sdk.dev/adapters/telegram

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE` (e.g. `support-agent` → `SUPPORT_AGENT_`).

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: why these variables are needed and where to get them (e.g. BotFather, Telegram API).
- **`vars`** — `{ name, type, required }[]`; `type` is `"text"` or `"password"` (use `"password"` for tokens and secrets).

**Suggested `vars` for this adapter:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_TELEGRAM_BOT_TOKEN` | password | yes |

Pass values explicitly into the adapter — do not rely on unprefixed `TELEGRAM_*` env names in agent code.

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Register webhook via Telegram Bot API using `execute_command` tool:

```shell
set -a && . ./.env && set +a && curl -sS -X POST "https://api.telegram.org/bot${MY_AGENT_TELEGRAM_BOT_TOKEN}/setWebhook" -H "Content-Type: application/json" -d "{\"url\":\"{public server URL}/api/agents/{agentId}/channels/telegram/webhook\"}"
```

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/telegram/webhook`.

## Add telegram adapter

```
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createTelegramAdapter } from "@chat-adapter/telegram";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      telegram: createTelegramAdapter({
        botToken: process.env.TEST_AGENT_TELEGRAM_BOT_TOKEN,
      }),
    },
  }),
});
```

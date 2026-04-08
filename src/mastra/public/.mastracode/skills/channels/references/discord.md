# Discord (`@chat-adapter/discord`)

**Docs:** https://chat-sdk.dev/adapters/discord

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Discord Developer Portal — bot token, application ID, public key, intents, interactions URL.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_DISCORD_BOT_TOKEN` | password | yes |
| `MY_AGENT_DISCORD_PUBLIC_KEY` | text | yes |
| `MY_AGENT_DISCORD_APPLICATION_ID` | text | yes |
| `MY_AGENT_DISCORD_MENTION_ROLE_IDS` | text | no |
| `MY_AGENT_DISCORD_CRON_SECRET` | password | no |

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Discord webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/discord/webhook`
2. Go to Discord Developer Portal → application → **General Information**
3. Set **Interactions Endpoint URL** to this webhook URL
4. Discord will send a PING to verify the endpoint

This handles slash commands, button clicks, and interactions. For regular messages, the adapter uses Gateway WebSocket (no webhook needed).

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/discord/webhook`.

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createDiscordAdapter } from "@chat-adapter/discord";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      discord: createDiscordAdapter({
        botToken: process.env.TEST_AGENT_DISCORD_BOT_TOKEN,
        publicKey: process.env.TEST_AGENT_DISCORD_PUBLIC_KEY,
        applicationId: process.env.TEST_AGENT_DISCORD_APPLICATION_ID,
        mentionRoleIds: process.env.TEST_AGENT_DISCORD_MENTION_ROLE_IDS?.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    },
  }),
});
```

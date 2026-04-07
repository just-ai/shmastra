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

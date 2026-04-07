# State — Redis (`@chat-adapter/state-redis`)

**Docs:** https://chat-sdk.dev/adapters/redis

Chat SDK **`state`**, not Mastra `channels`. Mastra uses **`storage`** for channel state. Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

**Redis URL**

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Dedicated Redis URL for this bot (subscriptions/locks); Upstash/serverless if needed.
- **`vars`** — `{ name, type, required }[]`.

| name | type | required |
|------|------|----------|
| `MY_AGENT_REDIS_URL` | password | yes |

**Messaging adapter** — call **`ask_env_vars_safely`** again using the vars from the platform you pair below (e.g. [telegram.md](telegram.md)).

## Example: `Agent` + `createAgentChannels`

Mastra channel state uses **Mastra `storage`**, not this Redis adapter. `createRedisState` is only for a raw Chat SDK `Chat` if you build one separately.

```typescript
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

// Optional — Chat SDK Chat only:
// import { createRedisState } from "@chat-adapter/state-redis";
// const state = createRedisState({ url: process.env.TEST_AGENT_REDIS_URL!, keyPrefix: "test-agent" });
```

# Zernio (`@zernio/chat-sdk-adapter`)

**Docs:** https://chat-sdk.dev/adapters/zernio

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Zernio dashboard API key, webhook URL and secret, connected social accounts.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_ZERNIO_API_KEY` | password | yes |
| `MY_AGENT_ZERNIO_WEBHOOK_SECRET` | password | no |
| `MY_AGENT_ZERNIO_API_BASE_URL` | text | no |
| `MY_AGENT_ZERNIO_BOT_NAME` | text | no |

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createZernioAdapter } from "@zernio/chat-sdk-adapter";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      zernio: createZernioAdapter({
        apiKey: process.env.TEST_AGENT_ZERNIO_API_KEY!,
        webhookSecret: process.env.TEST_AGENT_ZERNIO_WEBHOOK_SECRET,
        baseUrl: process.env.TEST_AGENT_ZERNIO_API_BASE_URL,
        botName: process.env.TEST_AGENT_ZERNIO_BOT_NAME,
      }),
    },
  }),
});
```

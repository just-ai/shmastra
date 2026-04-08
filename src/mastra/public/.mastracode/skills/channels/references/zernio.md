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

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Zernio webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/zernio/webhook`
2. Go to Zernio dashboard and create a webhook pointing to this URL
3. Select events: **message.received**, **comment.received**
4. Set a strong secret and provide it back — it will be stored as `MY_AGENT_ZERNIO_WEBHOOK_SECRET`

Note: the inbox addon must be enabled on the Zernio account to receive message webhooks.

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/zernio/webhook`.

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

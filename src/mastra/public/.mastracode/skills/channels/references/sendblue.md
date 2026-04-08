# Sendblue iMessage / SMS (`chat-adapter-sendblue`)

**Docs:** https://chat-sdk.dev/adapters/sendblue

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Sendblue API key/secret, registered `from` number (E.164), webhook secret and optional status callback.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_SENDBLUE_API_KEY` | password | yes |
| `MY_AGENT_SENDBLUE_API_SECRET` | password | yes |
| `MY_AGENT_SENDBLUE_FROM_NUMBER` | text | yes |
| `MY_AGENT_SENDBLUE_WEBHOOK_SECRET` | password | no |
| `MY_AGENT_SENDBLUE_STATUS_CALLBACK_URL` | text | no |

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Sendblue webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/sendblue/webhook`
2. Go to Sendblue dashboard and point webhook URLs to this URL
3. Set a webhook secret and provide it back — it will be stored as `MY_AGENT_SENDBLUE_WEBHOOK_SECRET`

The adapter handles three webhook types: inbound messages, outbound status, and typing indicators.

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/sendblue/webhook`.

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createSendblueAdapter } from "chat-adapter-sendblue";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      sendblue: createSendblueAdapter({
        apiKey: process.env.TEST_AGENT_SENDBLUE_API_KEY!,
        apiSecret: process.env.TEST_AGENT_SENDBLUE_API_SECRET!,
        defaultFromNumber: process.env.TEST_AGENT_SENDBLUE_FROM_NUMBER!,
        webhookSecret: process.env.TEST_AGENT_SENDBLUE_WEBHOOK_SECRET,
      }),
    },
  }),
});
```

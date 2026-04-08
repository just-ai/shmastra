# Email — Resend (`@resend/chat-sdk-adapter`)

**Docs:** https://chat-sdk.dev/adapters/resend

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Resend verified domain, API key, inbound webhook secret, `from` address for this bot.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_RESEND_FROM_ADDRESS` | text | yes |
| `MY_AGENT_RESEND_FROM_NAME` | text | no |
| `MY_AGENT_RESEND_API_KEY` | password | yes |
| `MY_AGENT_RESEND_WEBHOOK_SECRET` | password | yes |

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Resend webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/resend/webhook`
2. Go to Resend dashboard → **Webhooks**
3. Set webhook URL to this webhook URL
4. Copy the **Signing secret** and provide it back — it will be stored as `MY_AGENT_RESEND_WEBHOOK_SECRET`

The adapter handles inbound emails and threads them automatically via email headers.

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/resend/webhook`.

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createResendAdapter } from "@resend/chat-sdk-adapter";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      resend: createResendAdapter({
        fromAddress: process.env.TEST_AGENT_RESEND_FROM_ADDRESS!,
        fromName: process.env.TEST_AGENT_RESEND_FROM_NAME,
        apiKey: process.env.TEST_AGENT_RESEND_API_KEY,
        webhookSecret: process.env.TEST_AGENT_RESEND_WEBHOOK_SECRET,
      }),
    },
  }),
});
```

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

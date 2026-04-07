# Linear (`@chat-adapter/linear`)

**Docs:** https://chat-sdk.dev/adapters/linear

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Linear API key vs OAuth app, webhook URL and events, where secrets are shown once.
- **`vars`** — `{ name, type, required }[]`.

### API key — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_LINEAR_API_KEY` | password | yes |
| `MY_AGENT_LINEAR_WEBHOOK_SECRET` | password | yes |
| `MY_AGENT_LINEAR_BOT_USERNAME` | text | no |

### OAuth app (client credentials) — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_LINEAR_CLIENT_ID` | text | yes |
| `MY_AGENT_LINEAR_CLIENT_SECRET` | password | yes |
| `MY_AGENT_LINEAR_WEBHOOK_SECRET` | password | yes |

## Example: `Agent` + `createAgentChannels` (API key)

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createLinearAdapter } from "@chat-adapter/linear";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      linear: createLinearAdapter({
        apiKey: process.env.TEST_AGENT_LINEAR_API_KEY,
        webhookSecret: process.env.TEST_AGENT_LINEAR_WEBHOOK_SECRET,
        userName: process.env.TEST_AGENT_LINEAR_BOT_USERNAME,
      }),
    },
  }),
});
```

OAuth: same `Agent` shape with `clientId` / `clientSecret` / `webhookSecret` from `TEST_AGENT_LINEAR_*`.

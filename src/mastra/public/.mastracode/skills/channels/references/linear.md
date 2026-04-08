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

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Linear webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/linear/webhook`
2. Go to Linear → **Settings → API** → click **Create webhook**
3. Set **Label** (e.g. "Chat Bot")
4. Set **URL** to this webhook URL
5. Under **Data change events**, select: **Comments** (required), **Issues** (recommended), **Emoji reactions** (optional)
6. Copy the **Signing secret** (shown only once) and provide it back — it will be stored as `MY_AGENT_LINEAR_WEBHOOK_SECRET`

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/linear/webhook`.

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

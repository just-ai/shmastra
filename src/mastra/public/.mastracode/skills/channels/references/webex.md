# Webex (`@bitbasti/chat-adapter-webex`)

**Docs:** https://chat-sdk.dev/adapters/webex

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Webex Developer bot token, webhook registration and secret, messaging permissions.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_WEBEX_BOT_TOKEN` | password | yes |
| `MY_AGENT_WEBEX_WEBHOOK_SECRET` | password | no |
| `MY_AGENT_WEBEX_BASE_URL` | text | no |
| `MY_AGENT_WEBEX_BOT_USERNAME` | text | no |

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createWebexAdapter } from "@bitbasti/chat-adapter-webex";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      webex: createWebexAdapter({
        botToken: process.env.TEST_AGENT_WEBEX_BOT_TOKEN!,
        webhookSecret: process.env.TEST_AGENT_WEBEX_WEBHOOK_SECRET,
        baseUrl: process.env.TEST_AGENT_WEBEX_BASE_URL,
        userName: process.env.TEST_AGENT_WEBEX_BOT_USERNAME,
      }),
    },
  }),
});
```

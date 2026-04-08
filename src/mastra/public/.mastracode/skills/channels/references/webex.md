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

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Register webhooks via Webex API using `execute_command` tool. Two webhooks are needed — for messages and attachment actions:

```shell
set -a && . ./.env && set +a && \
curl -sS -X POST "https://webexapis.com/v1/webhooks" -H "Authorization: Bearer ${MY_AGENT_WEBEX_BOT_TOKEN}" -H "Content-Type: application/json" -d "{\"name\":\"messages\",\"targetUrl\":\"{public server URL}/api/agents/{agentId}/channels/webex/webhook\",\"resource\":\"messages\",\"event\":\"created\",\"secret\":\"${MY_AGENT_WEBEX_WEBHOOK_SECRET}\"}" && \
curl -sS -X POST "https://webexapis.com/v1/webhooks" -H "Authorization: Bearer ${MY_AGENT_WEBEX_BOT_TOKEN}" -H "Content-Type: application/json" -d "{\"name\":\"attachmentActions\",\"targetUrl\":\"{public server URL}/api/agents/{agentId}/channels/webex/webhook\",\"resource\":\"attachmentActions\",\"event\":\"created\",\"secret\":\"${MY_AGENT_WEBEX_WEBHOOK_SECRET}\"}"
```

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/webex/webhook`.

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

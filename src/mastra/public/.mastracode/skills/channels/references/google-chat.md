# Google Chat (`@chat-adapter/gchat`)

**Docs:** https://chat-sdk.dev/adapters/google-chat

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: GCP service account JSON, Chat app URL, optional Pub/Sub / delegation setup.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_GOOGLE_CHAT_CREDENTIALS` | password | yes* |
| `MY_AGENT_GOOGLE_CHAT_PUBSUB_TOPIC` | text | no |
| `MY_AGENT_GOOGLE_CHAT_IMPERSONATE_USER` | text | no |
| `MY_AGENT_GOOGLE_CHAT_PROJECT_NUMBER` | text | no |
| `MY_AGENT_GOOGLE_CHAT_PUBSUB_AUDIENCE` | text | no |

\*Or use Application Default Credentials in code instead; if so, describe that in `description` and adjust `vars` (e.g. a single `MY_AGENT_GOOGLE_CHAT_USE_ADC` as `text` if you still want it recorded).

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Google Chat webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/gchat/webhook`
2. Go to GCP Console → Chat API configuration → **Configuration**
3. Select **App URL** under connection settings
4. Set URL to this webhook URL
5. Click **Save**

For Pub/Sub setup, use the same URL as the push subscription endpoint.

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/gchat/webhook`.

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createGoogleChatAdapter } from "@chat-adapter/gchat";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      gchat: createGoogleChatAdapter({
        credentials: process.env.TEST_AGENT_GOOGLE_CHAT_CREDENTIALS,
        pubsubTopic: process.env.TEST_AGENT_GOOGLE_CHAT_PUBSUB_TOPIC,
        impersonateUser: process.env.TEST_AGENT_GOOGLE_CHAT_IMPERSONATE_USER,
        googleChatProjectNumber: process.env.TEST_AGENT_GOOGLE_CHAT_PROJECT_NUMBER,
        pubsubAudience: process.env.TEST_AGENT_GOOGLE_CHAT_PUBSUB_AUDIENCE,
      }),
    },
  }),
});
```

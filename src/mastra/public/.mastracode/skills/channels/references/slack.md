# Slack (`@chat-adapter/slack`)

**Docs:** https://chat-sdk.dev/adapters/slack

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Slack app setup (api.slack.com), OAuth vs single workspace, where to copy the token and signing secret.
- **`vars`** — `{ name, type, required }[]`; `type` is `"text"` or `"password"`.

### Single workspace — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_SLACK_BOT_TOKEN` | password | yes |
| `MY_AGENT_SLACK_SIGNING_SECRET` | password | yes |
| `MY_AGENT_SLACK_ENCRYPTION_KEY` | password | no |

### Multi-workspace (OAuth) — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_SLACK_CLIENT_ID` | text | yes |
| `MY_AGENT_SLACK_CLIENT_SECRET` | password | yes |
| `MY_AGENT_SLACK_SIGNING_SECRET` | password | yes |

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Slack webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/slack/webhook`
2. Go to [api.slack.com/apps](https://api.slack.com/apps) and open the app manifest
3. Set both `event_subscriptions.request_url` and `interactivity.request_url` to this webhook URL:
```yaml
settings:
  event_subscriptions:
    request_url: <webhook URL>
  interactivity:
    is_enabled: true
    request_url: <webhook URL>
```

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/slack/webhook`.

## Example: `Agent` + `createAgentChannels` (single workspace)

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createSlackAdapter } from "@chat-adapter/slack";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      slack: createSlackAdapter({
        botToken: process.env.TEST_AGENT_SLACK_BOT_TOKEN,
        signingSecret: process.env.TEST_AGENT_SLACK_SIGNING_SECRET,
        encryptionKey: process.env.TEST_AGENT_SLACK_ENCRYPTION_KEY,
      }),
    },
  }),
});
```

## Example: OAuth

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createSlackAdapter } from "@chat-adapter/slack";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      slack: createSlackAdapter({
        clientId: process.env.TEST_AGENT_SLACK_CLIENT_ID!,
        clientSecret: process.env.TEST_AGENT_SLACK_CLIENT_SECRET!,
        signingSecret: process.env.TEST_AGENT_SLACK_SIGNING_SECRET!,
      }),
    },
  }),
});
```

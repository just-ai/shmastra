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

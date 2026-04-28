# Mattermost (`chat-adapter-mattermost`)

**Docs:** https://chat-sdk.dev/adapters/mattermost

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Mattermost server URL and bot account access token; bot account must have permissions to post and read messages in target channels.
- **`vars`** — `{ name, type, required }[]`; `type` is `"text"` or `"password"` (use `"password"` for tokens and secrets).

**Suggested `vars` for this adapter:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_MATTERMOST_BASE_URL` | text | yes |
| `MY_AGENT_MATTERMOST_BOT_TOKEN` | password | yes |

Pass values explicitly into the adapter — do not rely on unprefixed `MATTERMOST_*` env names in agent code.

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

In Mattermost **System Console → Integrations → Interactive Dialogs**, register the public webhook URL:

```
{public server URL}/api/agents/{agentId}/channels/mattermost/webhook
```

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/mattermost/webhook`.

## Add mattermost adapter

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createMattermostAdapter } from "chat-adapter-mattermost";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      mattermost: createMattermostAdapter({
        baseUrl: process.env.TEST_AGENT_MATTERMOST_BASE_URL!,
        botToken: process.env.TEST_AGENT_MATTERMOST_BOT_TOKEN!,
      }),
    },
  }),
});
```

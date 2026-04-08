# Liveblocks (`@liveblocks/chat-sdk-adapter`)

**Docs:** https://chat-sdk.dev/adapters/liveblocks

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Liveblocks secret key, webhook secret, bot user id aligned with your app’s user model, comment webhooks.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_LIVEBLOCKS_SECRET_KEY` | password | yes |
| `MY_AGENT_LIVEBLOCKS_WEBHOOK_SECRET` | password | yes |
| `MY_AGENT_LIVEBLOCKS_BOT_USER_ID` | text | yes |
| `MY_AGENT_LIVEBLOCKS_BOT_USER_NAME` | text | no |

`resolveUsers` / `resolveGroupsInfo` remain code-only.

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Liveblocks webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/liveblocks/webhook`
2. Go to Liveblocks project → **Webhooks**
3. Set webhook URL to this webhook URL
4. Subscribe to events: **commentCreated**, **commentReactionAdded**, **commentReactionRemoved**
5. Copy the **Signing secret** and provide it back — it will be stored as `MY_AGENT_LIVEBLOCKS_WEBHOOK_SECRET`

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/liveblocks/webhook`.

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createLiveblocksAdapter } from "@liveblocks/chat-sdk-adapter";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      liveblocks: createLiveblocksAdapter({
        apiKey: process.env.TEST_AGENT_LIVEBLOCKS_SECRET_KEY!,
        webhookSecret: process.env.TEST_AGENT_LIVEBLOCKS_WEBHOOK_SECRET!,
        botUserId: process.env.TEST_AGENT_LIVEBLOCKS_BOT_USER_ID!,
        botUserName: process.env.TEST_AGENT_LIVEBLOCKS_BOT_USER_NAME,
        resolveUsers: async ({ userIds }) =>
          userIds.map(() => ({ name: "User" })),
      }),
    },
  }),
});
```

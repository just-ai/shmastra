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

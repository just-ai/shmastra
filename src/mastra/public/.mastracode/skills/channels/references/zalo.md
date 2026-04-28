# Zalo (`chat-adapter-zalo`)

**Docs:** https://chat-sdk.dev/adapters/zalo

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Zalo bot token (format `12345689:abc-xyz`) and webhook secret used to verify incoming webhook requests.
- **`vars`** — `{ name, type, required }[]`; `type` is `"text"` or `"password"` (use `"password"` for tokens and secrets).

**Suggested `vars` for this adapter:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_ZALO_BOT_TOKEN` | password | yes |
| `MY_AGENT_ZALO_WEBHOOK_SECRET` | password | yes |

Pass values explicitly into the adapter — do not rely on unprefixed `ZALO_*` env names in agent code.

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

Register the webhook URL with Zalo Bot Platform pointing at:

```
{public server URL}/api/agents/{agentId}/channels/zalo/webhook
```

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/zalo/webhook`.

## Add zalo adapter

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createZaloAdapter } from "chat-adapter-zalo";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      zalo: createZaloAdapter({
        botToken: process.env.TEST_AGENT_ZALO_BOT_TOKEN!,
        webhookSecret: process.env.TEST_AGENT_ZALO_WEBHOOK_SECRET!,
      }),
    },
  }),
});
```

**Capabilities:** text, images, stickers. Message editing/deletion is not supported.

# iMessage — Photon (`chat-adapter-imessage`)

**Docs:** https://chat-sdk.dev/adapters/imessage

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Remote Photon vs local macOS mode, Photon dashboard URL/API key, or Full Disk Access for local.
- **`vars`** — `{ name, type, required }[]`.

### Remote (Photon) — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_IMESSAGE_LOCAL` | text | yes |
| `MY_AGENT_IMESSAGE_SERVER_URL` | text | yes |
| `MY_AGENT_IMESSAGE_API_KEY` | password | yes |
| `MY_AGENT_IMESSAGE_CRON_SECRET` | password | no |

### Local macOS — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_IMESSAGE_LOCAL` | text | yes |

(Use `true` / `false` as the value; no secrets if purely local.)

## Example: `Agent` + `createAgentChannels` (remote)

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createiMessageAdapter } from "chat-adapter-imessage";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      imessage: createiMessageAdapter({
        local: process.env.TEST_AGENT_IMESSAGE_LOCAL !== "false",
        serverUrl: process.env.TEST_AGENT_IMESSAGE_SERVER_URL,
        apiKey: process.env.TEST_AGENT_IMESSAGE_API_KEY,
      }),
    },
  }),
});
```

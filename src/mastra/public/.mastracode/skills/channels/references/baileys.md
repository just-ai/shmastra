# WhatsApp — Baileys (`chat-adapter-baileys`)

**Docs:** https://chat-sdk.dev/adapters/baileys

Unofficial WhatsApp Web API — compliance risk. Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Unique on-disk session directory per agent, QR / pairing flow, long-lived process requirement.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_BAILEYS_AUTH_DIR` | text | yes |

## Example: `Agent` + `createAgentChannels`

`useMultiFileAuthState` is async — export a factory that returns `Agent`.

```typescript
import { Agent } from "@mastra/core/agent";
import { useMultiFileAuthState } from "baileys";
import { createBaileysAdapter } from "chat-adapter-baileys";
import { createAgentChannels } from "../shmastra";

export async function createTestAgent() {
  const { state, saveCreds } = await useMultiFileAuthState(
    process.env.TEST_AGENT_BAILEYS_AUTH_DIR!,
  );

  return new Agent({
    id: "test-agent",
    ...
    channels: createAgentChannels({
      adapters: {
        whatsapp: createBaileysAdapter({
          adapterName: "test-agent-baileys",
          auth: { state, saveCreds },
          userName: "test-agent",
          onQR: async (qr) => {
            /* render QR */
          },
        }),
      },
    }),
  });
}
```

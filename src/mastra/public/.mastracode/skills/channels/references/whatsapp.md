# WhatsApp Business Cloud (`@chat-adapter/whatsapp`)

**Docs:** https://chat-sdk.dev/adapters/whatsapp

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Meta Developer app, WhatsApp product, Phone Number ID, permanent/system user token, webhook verify token and `messages` subscription.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_WHATSAPP_ACCESS_TOKEN` | password | yes |
| `MY_AGENT_WHATSAPP_APP_SECRET` | password | yes |
| `MY_AGENT_WHATSAPP_PHONE_NUMBER_ID` | text | yes |
| `MY_AGENT_WHATSAPP_VERIFY_TOKEN` | password | yes |
| `MY_AGENT_WHATSAPP_BOT_USERNAME` | text | no |

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

WhatsApp webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/whatsapp/webhook`
2. Go to Meta Developer dashboard → **WhatsApp → Configuration**
3. Set **Callback URL** to this webhook URL
4. Set **Verify token** to match `MY_AGENT_WHATSAPP_VERIFY_TOKEN`
5. Subscribe to the **messages** webhook field

The adapter handles both GET (verification handshake) and POST (event delivery) automatically.

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/whatsapp/webhook`.

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      whatsapp: createWhatsAppAdapter({
        accessToken: process.env.TEST_AGENT_WHATSAPP_ACCESS_TOKEN,
        appSecret: process.env.TEST_AGENT_WHATSAPP_APP_SECRET,
        phoneNumberId: process.env.TEST_AGENT_WHATSAPP_PHONE_NUMBER_ID,
        verifyToken: process.env.TEST_AGENT_WHATSAPP_VERIFY_TOKEN,
        userName: process.env.TEST_AGENT_WHATSAPP_BOT_USERNAME,
      }),
    },
  }),
});
```

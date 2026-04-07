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

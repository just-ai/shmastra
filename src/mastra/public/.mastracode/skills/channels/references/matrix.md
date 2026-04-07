# Matrix / Beeper (`@beeper/chat-adapter-matrix`)

**Docs:** https://chat-sdk.dev/adapters/matrix

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Beeper/Matrix homeserver URL, access token vs password auth, optional E2EE recovery key.
- **`vars`** — `{ name, type, required }[]`.

### Access token — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_MATRIX_BASE_URL` | text | yes |
| `MY_AGENT_MATRIX_ACCESS_TOKEN` | password | yes |
| `MY_AGENT_MATRIX_USER_ID` | text | no |
| `MY_AGENT_MATRIX_RECOVERY_KEY` | password | no |
| `MY_AGENT_MATRIX_BOT_USERNAME` | text | no |

### Password auth — use instead of access token

| name | type | required |
|------|------|----------|
| `MY_AGENT_MATRIX_BASE_URL` | text | yes |
| `MY_AGENT_MATRIX_USERNAME` | text | yes |
| `MY_AGENT_MATRIX_PASSWORD` | password | yes |
| `MY_AGENT_MATRIX_USER_ID` | text | no |

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createMatrixAdapter } from "@beeper/chat-adapter-matrix";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      matrix: createMatrixAdapter({
        baseURL: process.env.TEST_AGENT_MATRIX_BASE_URL!,
        auth: {
          type: "accessToken",
          accessToken: process.env.TEST_AGENT_MATRIX_ACCESS_TOKEN!,
          userID: process.env.TEST_AGENT_MATRIX_USER_ID,
        },
        recoveryKey: process.env.TEST_AGENT_MATRIX_RECOVERY_KEY,
      }),
    },
  }),
});
```

# Microsoft Teams (`@chat-adapter/teams`)

**Docs:** https://chat-sdk.dev/adapters/teams

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: Azure Bot registration, app ID / password / tenant, messaging endpoint.
- **`vars`** — `{ name, type, required }[]`.

**Suggested `vars`:**

| name | type | required |
|------|------|----------|
| `MY_AGENT_TEAMS_APP_ID` | text | yes |
| `MY_AGENT_TEAMS_APP_PASSWORD` | password | yes |
| `MY_AGENT_TEAMS_APP_TENANT_ID` | text | yes (SingleTenant) |

## Example: `Agent` + `createAgentChannels`

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createTeamsAdapter } from "@chat-adapter/teams";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      teams: createTeamsAdapter({
        appType: "SingleTenant",
        appId: process.env.TEST_AGENT_TEAMS_APP_ID,
        appPassword: process.env.TEST_AGENT_TEAMS_APP_PASSWORD,
        appTenantId: process.env.TEST_AGENT_TEAMS_APP_TENANT_ID,
      }),
    },
  }),
});
```

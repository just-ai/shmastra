# GitHub (`@chat-adapter/github`)

**Docs:** https://chat-sdk.dev/adapters/github

Replace `MY_AGENT` with this agent’s id in `SCREAMING_SNAKE_CASE`.

## Call `ask_env_vars_safely` first

Invoke **`ask_env_vars_safely`** with:

- **`description`** — `string`: PAT vs GitHub App, webhook URL, required permissions/scopes, where to copy secrets.
- **`vars`** — `{ name, type, required }[]`.

### Personal Access Token — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_GITHUB_TOKEN` | password | yes |
| `MY_AGENT_GITHUB_WEBHOOK_SECRET` | password | yes |
| `MY_AGENT_GITHUB_BOT_USERNAME` | text | no |

### GitHub App — suggested `vars`

| name | type | required |
|------|------|----------|
| `MY_AGENT_GITHUB_APP_ID` | text | yes |
| `MY_AGENT_GITHUB_PRIVATE_KEY` | password | yes |
| `MY_AGENT_GITHUB_INSTALLATION_ID` | text | no |
| `MY_AGENT_GITHUB_WEBHOOK_SECRET` | password | yes |
| `MY_AGENT_GITHUB_BOT_USERNAME` | text | no |

## Init webhook

**IMPORTANT: skip this step if there is no public server URL available in current environment**

GitHub webhooks cannot be registered automatically — provide the user with a manual instruction and the full webhook URL.

Tell the user:

1. The full webhook URL: `{public server URL}/api/agents/{agentId}/channels/github/webhook`
2. Go to GitHub App settings or repo **Settings → Webhooks → Add webhook**
3. Set **Payload URL** to this webhook URL
4. Set **Content type** to `application/json`
5. Set **Secret** to match `MY_AGENT_GITHUB_WEBHOOK_SECRET`
6. Subscribe to events: **Issue comments**, **Pull request review comments**

Replace `{public server URL}` with the actual public URL and `{agentId}` with the agent's id.

**Do not use Mastra REST API prefix** — use path strictly: `/api/agents/{agentId}/channels/github/webhook`.

## Example: `Agent` + `createAgentChannels` (GitHub App)

```typescript
import { Agent } from "@mastra/core/agent";
import { createAgentChannels } from "../shmastra";
import { createGitHubAdapter } from "@chat-adapter/github";

export const testAgent = new Agent({
  id: "test-agent",
  ...
  channels: createAgentChannels({
    adapters: {
      github: createGitHubAdapter({
        appId: process.env.TEST_AGENT_GITHUB_APP_ID,
        privateKey: process.env.TEST_AGENT_GITHUB_PRIVATE_KEY,
        installationId: process.env.TEST_AGENT_GITHUB_INSTALLATION_ID
          ? parseInt(process.env.TEST_AGENT_GITHUB_INSTALLATION_ID, 10)
          : undefined,
        webhookSecret: process.env.TEST_AGENT_GITHUB_WEBHOOK_SECRET,
        userName: process.env.TEST_AGENT_GITHUB_BOT_USERNAME,
      }),
    },
  }),
});
```

PAT variant: same `Agent` shape; pass `token: process.env.TEST_AGENT_GITHUB_TOKEN` and `webhookSecret` instead of app fields.

---
name: channels
description: "Mastra agent channels (Slack, Discord, Telegram, etc.) via Chat SDK adapters. In this project, wrap agent tools with createAgentTools() and channel config with createAgentChannels() from ../shmastra; register agents on Mastra with storage for channel state."
---

# Agent channels (Mastra)

[Mastra channels](https://mastra.ai/docs/agents/channels/llms.txt) (since `@mastra/core@1.22.0`) connect agents to messaging platforms. Incoming messages run through the normal agent pipeline; replies stream back into the conversation.

**Official docs:** 
 - [Channels](https://mastra.ai/docs/agents/channels/llms.txt) 
 - [Channels reference](https://mastra.ai/reference/agents/channels/llms.txt) 
 - [Chat SDK adapters](https://chat-sdk.dev/adapters)

## When to use channels

Use them when the agent should respond in Slack, Discord, Telegram, or other supported platforms—DMs, mentions in threads, and group context (with sender labels and optional thread history prefetch).

## Available channel adapters

| File | Package                       |
|------|-------------------------------|
| [slack.md](references/slack.md) | `@chat-adapter/slack`         |
| [teams.md](references/teams.md) | `@chat-adapter/teams`         |
| [google-chat.md](references/google-chat.md) | `@chat-adapter/gchat`         |
| [discord.md](references/discord.md) | `@chat-adapter/discord`       |
| [github.md](references/github.md) | `@chat-adapter/github`        |
| [linear.md](references/linear.md) | `@chat-adapter/linear`        |
| [telegram.md](references/telegram.md) | `@chat-adapter/telegram`      |
| [whatsapp.md](references/whatsapp.md) | `@chat-adapter/whatsapp`      |
| [matrix.md](references/matrix.md) | `@beeper/chat-adapter-matrix` |
| [imessage.md](references/imessage.md) | `chat-adapter-imessage`       |
| [resend.md](references/resend.md) | `@resend/chat-sdk-adapter`    |
| [zernio.md](references/zernio.md) | `@zernio/chat-sdk-adapter`    |
| [liveblocks.md](references/liveblocks.md) | `@liveblocks/chat-sdk-adapter` |
| [webex.md](references/webex.md) | `@bitbasti/chat-adapter-webex` |
| [baileys.md](references/baileys.md) | `chat-adapter-baileys` `baileys`       |
| [sendblue.md](references/sendblue.md) | `chat-adapter-sendblue`       |

## How to add channels to agent

1. Read channel-specific reference before starting (e.g. [`telegram.md`](references/telegram.md),)
2. Install the adapter package (e.g. `@chat-adapter/telegram`).
3. Pass `channels` on the `Agent` using Chat SDK adapter factories inside `createAgentChannels`.

Adapters typically read credentials from environment variables; see each adapter’s docs for setup.

## Use createAgentChannels to wrap channels

Do **not** attach raw `channels` objects directly when defining agents in this codebase.

Always wrap the channel configuration with **`createAgentChannels`** from `../shmastra`. 
It applies shared handlers (attachments → stored files, reply formatting for Telegram, etc.) around the Chat SDK adapters.

Together, a channel-enabled agent should look like this:

```
import { Agent } from "@mastra/core/agent";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createAgentChannels } from "../shmastra";

export const supportAgent = new Agent({
  ...
  channels: createAgentChannels({
    adapters: {
      telegram: createTelegramAdapter({
        botToken: process.env.SUPPORT_AGENT_TELEGRAM_BOT_TOKEN,
      }),
    },
  }),
});
```
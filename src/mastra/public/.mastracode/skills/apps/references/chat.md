# AgentChat Component

A ready-made chat UI at `/shmastra/public/apps/script/chat.js`. ChatGPT-style interface with streaming, file uploads, markdown rendering, and dark theme support. Styles are loaded automatically from `/shmastra/public/apps/style/chat.css`.

**Use this component instead of building chat UI from scratch.**

## Basic usage

```js
import { html } from 'htm/preact';
import { AgentChat } from '/shmastra/public/apps/script/chat.js';

function App() {
  return html`
    <${AgentChat}
      agentId="my-agent"
      title="My Assistant"
      subtitle="How can I help you?"
      suggestions=${['Hello', 'What can you do?']}
      resource="my-app"
      height="100vh"
    />
  `;
}
```

## Props

### Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `agentId` | string | **required** | Mastra agent ID |
| `title` | string | `'AI Assistant'` | Agent name — shown in empty state and as the vertical label on the collapsed panel tab |
| `subtitle` | string | `'Ask me anything'` | Empty state description |
| `placeholder` | string | `'Message...'` | Input placeholder text |
| `suggestions` | `string[]` | `[]` | Quick-start suggestion buttons |

### Memory

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resource` | string | `'app'` | Memory resource ID |
| `threadId` | string | auto-generated | Fixed thread ID (auto-generated per session if omitted) |

### Layout & Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | string | `'100vh'` | CSS height (non-panel mode only) |
| `class` | string | — | Extra CSS class on the root element |
| `style` | object | — | CSS variable overrides (see Theming below) |

### Panel mode

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `panel` | `'right'` \| `'left'` \| `false` | `false` | Fixed side panel mode |
| `panelWidth` | number | `480` | Initial panel width in px |
| `panelMinWidth` | number | `320` | Minimum resize width in px |
| `panelMaxWidth` | number | `800` | Maximum resize width in px (capped at 50% viewport) |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onResize` | `(width) => void` | Panel width changed or collapsed (`width=0`) |
| `onMessage` | `(msg) => void` | Called after each message `{ role, content }` (both user and assistant) |
| `onError` | `(error) => void` | Called on stream errors |
| `onNewChat` | `() => void` | Called when new chat is started |

### Custom renderers

| Prop | Type | Description |
|------|------|-------------|
| `renderMessage` | `(msg, index) => vnode` | Custom message renderer. Receives `{ role, content, files? }` |
| `renderEmpty` | `() => vnode` | Replace default empty state entirely |
| `renderHeader` | `() => vnode` | Render custom content above the messages area |

## Theming

You can override CSS variables via the `style` prop if you need it:

```js
<${AgentChat}
  agentId="my-agent"
  style=${{
    '--sc-bg': '#1a1a2e',
    '--sc-panel-bg': '#16163a',
    '--sc-text': '#e0e0e0',
    '--sc-muted': '#888',
    '--sc-border': '#2a2a4a',
    '--sc-input-bg': '#222244',
    '--sc-bubble-user': '#2a2a4a',
  }}
/>
```

Available CSS variables:

| Variable | Default (light) | Description |
|----------|----------------|-------------|
| `--sc-bg` | `#fff` | Chat background |
| `--sc-panel-bg` | `#f7f7f8` | Panel background (slightly different from app) |
| `--sc-text` | `#1a1a1a` | Primary text color |
| `--sc-muted` | `#999` | Secondary/muted text |
| `--sc-border` | `#e5e5e5` | Borders and dividers |
| `--sc-input-bg` | `#f4f4f4` | Input field background |
| `--sc-hover-bg` | `#fafafa` | Hover state background |
| `--sc-bubble-user` | `#f4f4f4` | User message bubble |
| `--sc-code-bg` | `#f4f4f4` | Inline code background |
| `--sc-pre-bg` | `#1e1e1e` | Code block background |
| `--sc-pre-text` | `#d4d4d4` | Code block text |

All variables have dark mode defaults that activate via `prefers-color-scheme: dark` or `data-theme="dark"`.

## Panel mode

When `panel` is set, the chat becomes a fixed sidebar pinned to the viewport edge:

- **Collapsible** — toggle button on the panel edge; when collapsed, a vertical side tab with the agent name (`title`) peeks from the screen edge
- **Resizable** — drag the inner edge to resize between `panelMinWidth` and `panelMaxWidth`
- **Persistent width** — panel width is saved to `localStorage` per agent
- **Reactive** — `onResize(width)` callback lets the parent adjust its layout

### Example: resizable right sidebar

```js
import { html, render } from 'htm/preact';
import { useState } from 'preact/hooks';
import { AgentChat } from '/shmastra/public/apps/script/chat.js';

function App() {
  const [chatWidth, setChatWidth] = useState(480);

  return html`
    <div class="min-h-screen bg-base-200" style="margin-right:${chatWidth}px; transition:margin 0.25s ease;">
      <main class="p-4">
        <!-- main content adjusts automatically -->
      </main>
    </div>
    <${AgentChat}
      agentId="my-agent"
      panel="right"
      resource="my-app"
      onResize=${setChatWidth}
    />
  `;
}

render(html`<${App} />`, document.getElementById('app'));
```

### Example: custom styled panel

```js
<${AgentChat}
  agentId="my-agent"
  panel="right"
  placeholder="Ask about deposits..."
  style=${{ '--sc-panel-bg': '#f0f0f5', '--sc-border': '#d0d0dd' }}
  onMessage=${(msg) => console.log('Message:', msg)}
  onNewChat=${() => console.log('Chat reset')}
  onResize=${setChatWidth}
/>
```

### Example: custom renderers

```js
<${AgentChat}
  agentId="my-agent"
  renderHeader=${() => html`
    <div class="p-3 border-b border-base-300 font-semibold">Custom Header</div>
  `}
  renderEmpty=${() => html`
    <div class="flex items-center justify-center h-full">
      <p class="text-lg opacity-50">Start a conversation</p>
    </div>
  `}
  renderMessage=${(msg, i) => html`
    <div class="p-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}">
      <strong>${msg.role}:</strong> ${msg.content}
    </div>
  `}
/>
```

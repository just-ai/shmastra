---
name: apps
description: "Guide how to build modern web applications for agents and workflows. Use this skill when user asks to create a web app, UI, dashboard, frontend, or page for their agents or workflows."
---

# Web Apps Skill

Create lightweight web applications for Mastra agents and workflows.
No build step required — apps run directly in the browser using ES modules, import maps, Preact, Tailwind CSS, and DaisyUI.

**IMPORTANT: only create a web app when the user explicitly asks for one (e.g. "make a dashboard", "create a UI").**
If the user asks to enhance an agent's output (e.g. charts, rich responses), use a tool that generates an HTML file and returns its URL instead — that does not require a full web app.

## References

- [DaisyUI components](references/daisyui.md) — all supported DaisyUI components
- [Icons](references/icons.md) — how to use Lucide icons via import map
- [AgentChat component](references/chat.md) — ready-made chat UI for agents with streaming, panel mode, file uploads
- [Mastra API](references/mastra-api.md) — how to call mastra server API (agents, workflows, tools, error handling)
- [Charts](references/charts.md) — how to insert charts in apps

## Architecture

Each app is a folder inside `src/mastra/public/apps/`:

```
src/mastra/public/apps/my-app/
  index.html          # Entry point with import map, Tailwind, DaisyUI
  app.js              # Root Preact component
  components/
    header.js         # UI components as separate ES modules
    dashboard.js
    ...
```

Apps are served at `/shmastra/apps/my-app`. All relative imports resolve correctly.

## index.html template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App Title</title>

  <!-- System theme detection -->
  <script src="/shmastra/public/apps/script/theme.js"></script>

  <!-- Tailwind CSS + DaisyUI -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" />

  <!-- Import Map for Preact -->
  <script type="importmap">
  {
    "imports": {
      "preact": "https://esm.sh/preact@10",
      "preact/": "https://esm.sh/preact@10/",
      "preact/hooks": "https://esm.sh/preact@10/hooks",
      "htm/preact": "https://esm.sh/htm@3/preact",
      "lucide": "https://unpkg.com/lucide@latest/dist/esm/lucide.js"
    }
  }
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/shmastra/apps/my-app/app.js"></script>
</body>
</html>
```

## Component files (.js)

Use `htm` tagged templates instead of JSX (no build step needed):

```js
// app.js
import { html, render } from 'htm/preact';
import { useState } from 'preact/hooks';
import { Counter } from './components/counter.js';

function App() {
  return html`
    <div class="min-h-screen bg-base-200">
      <main class="container mx-auto p-4">
        <${Counter} />
      </main>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app'));
```

```js
// components/counter.js
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';

export function Counter() {
  const [count, setCount] = useState(0);

  return html`
    <div class="card bg-base-100 shadow-xl p-6">
      <h2 class="text-2xl font-bold mb-4">Count: ${count}</h2>
      <button class="btn btn-primary" onClick=${() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  `;
}
```

## Adding extra dependencies

Add any ESM-compatible library to the import map. Use `esm.sh` to load npm packages as ES modules:

```json
{
  "imports": {
    "chart.js": "https://esm.sh/chart.js@4",
    "chart.js/auto": "https://esm.sh/chart.js@4/auto",
    "marked": "https://esm.sh/marked@12"
  }
}
```

## Custom API routes

If the app needs a custom backend endpoint (e.g. aggregation, DB query, proxy), create a route in `src/mastra/routes/` and register it in `src/mastra/routes/index.ts`:

**IMPORTANT: use custom routes if your app really requires it. Always prefer calling workflows and tools directly using mastra client from `client.js`.**

Route paths must use the prefix `/shmastra/api/apps/<app-name>/`:

```ts
// src/mastra/routes/deposits.ts
import { ApiRoute } from '@mastra/core/server';

export const depositsRoute: ApiRoute = {
  path: '/shmastra/api/apps/deposits/summary',
  method: 'GET',
  handler: async (c) => {
    // your logic here
    return c.json({ total: 42 });
  },
};
```

```ts
// src/mastra/routes/index.ts
import { ApiRoute } from '@mastra/core/server';
import { depositsRoute } from './deposits';

export const apiRoutes: ApiRoute[] = [depositsRoute];
```

In the app, use regular `fetch` to call custom routes (auth token is injected automatically):

```js
const res = await fetch('/shmastra/api/apps/deposits/summary');
const data = await res.json();
```

**Only create custom routes when the Mastra API (agents, workflows, tools) is not enough.** 
Prefer calling workflows, agents and tools over custom routes.

## Rules

1. **Route path prefix** — all custom API routes must use `/shmastra/api/apps/<app-name>/` prefix
2. **No build step** — everything runs as-is in the browser
2. **One folder per app** inside `src/mastra/public/apps/`
3. **One `index.html`** per app — entry point with import map and CDN links
4. **Separate `.js` files** for each component — no inline scripts in HTML
5. **Use `htm` tagged templates** — never raw JSX (requires transpilation)
6. **Use `esm.sh`** for all npm dependencies via import map
7. **Relative imports** between app files — `./components/foo.js` (always include `.js` extension)

## App link in agent response

When your agent returns a link to the app, use markdown:

```
Here is your application: [Open Dashboard](/shmastra/apps/my-app)
```

The link will open separate browser tab and resolve index.html

## Apply changes

After creating or modifying app files, call `apply_changes` to sync files to the working directory.

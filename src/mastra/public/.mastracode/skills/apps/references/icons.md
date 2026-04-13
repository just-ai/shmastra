# Icons with Lucide

Use **Lucide** for icons. Add it to the import map:

```json
{
  "imports": {
    "lucide": "https://unpkg.com/lucide@latest/dist/esm/lucide.js"
  }
}
```

## Usage

Call `createIcons()` after the component mounts to replace `<i>` elements with SVG icons:

```js
import { html } from 'htm/preact';
import { useEffect } from 'preact/hooks';
import { createIcons, icons } from 'lucide';

export function MyComponent() {
  useEffect(() => { createIcons({ icons }); });

  return html`
    <div class="flex items-center gap-2">
      <i data-lucide="search" class="w-4 h-4"></i>
      <span>Search</span>
    </div>
  `;
}
```

**Important:** call `createIcons({ icons })` inside `useEffect` without a dependency array (runs after every render) so newly rendered icons get replaced.

## Common icons

Use the `data-lucide` attribute with the icon name in kebab-case:

```html
<i data-lucide="home"></i>
<i data-lucide="settings"></i>
<i data-lucide="user"></i>
<i data-lucide="search"></i>
<i data-lucide="plus"></i>
<i data-lucide="trash-2"></i>
<i data-lucide="edit"></i>
<i data-lucide="check"></i>
<i data-lucide="x"></i>
<i data-lucide="chevron-down"></i>
<i data-lucide="arrow-right"></i>
<i data-lucide="download"></i>
<i data-lucide="upload"></i>
<i data-lucide="refresh-cw"></i>
<i data-lucide="alert-circle"></i>
```

## Sizing

Control size with Tailwind classes on the `<i>` element:

```html
<i data-lucide="star" class="w-4 h-4"></i>   <!-- 16px -->
<i data-lucide="star" class="w-5 h-5"></i>   <!-- 20px -->
<i data-lucide="star" class="w-6 h-6"></i>   <!-- 24px -->
```

Full icon list: https://lucide.dev/icons

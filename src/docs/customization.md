# Customization

The Emotist documentation app is designed to be highly customizable and lightweight. Since it is styled using Vanilla CSS, you can adjust the look and feel by modifying CSS custom properties or updating the React components.

---

## Modifying Themes & Colors

All branding colors, typography, spacings, and borders are mapped to CSS custom variables declared in the `:root` pseudo-class. 

To change themes, edit [src/index.css](file:///Users/abijith/Desktop/Emotist/Apps/documentation/src/index.css):

### HSL Color Tokens
We use HSL (Hue, Saturation, Lightness) for a clean styling setup. You can adjust the baseline colors:

```css
:root {
  /* Light Mode Palette */
  --primary-hue: 250; /* Indigo */
  
  --bg-primary: hsl(var(--primary-hue), 30%, 98%);
  --bg-secondary: hsl(var(--primary-hue), 20%, 94%);
  --text-primary: hsl(var(--primary-hue), 40%, 15%);
  --text-secondary: hsl(var(--primary-hue), 20%, 45%);
  --border-color: hsl(var(--primary-hue), 20%, 88%);
}

[data-theme="dark"] {
  /* Dark Mode Palette */
  --bg-primary: hsl(var(--primary-hue), 30%, 6%);
  --bg-secondary: hsl(var(--primary-hue), 25%, 11%);
  --text-primary: hsl(var(--primary-hue), 10%, 92%);
  --text-secondary: hsl(var(--primary-hue), 15%, 65%);
  --border-color: hsl(var(--primary-hue), 20%, 18%);
}
```

By altering `--primary-hue`, you can shift the entire color scheme:
- `210` for a sleek ocean blue
- `340` for a vibrant rose red
- `140` for a clean emerald green

---

## Adding New Doc Pages

To add a new documentation page, follow these simple steps:

1. Create a new markdown file in `src/docs/`, for example `src/docs/deployment.md`.
2. Add your page content, making sure to start with a top-level heading (`# My Title`).
3. Register the new document in `src/docs-config.ts`. Here is how you do it:

```typescript
import deployment from './docs/deployment.md?raw';

export const DOCS = {
  'getting-started': {
    title: 'Getting Started',
    pages: [
      { id: 'introduction', title: 'Introduction', content: introduction },
      { id: 'installation', title: 'Installation', content: installation },
      { id: 'deployment', title: 'Deployment Guide', content: deployment } // Added here
    ]
  }
};
```

The app's left sidebar, the Cmd+K Search index, and the URL routers will automatically update to support the new page!

---

## Customizing Code Syntax Styles

Code syntax highlighting and theme styles are controlled by CSS classes matching markdown output. You can edit the `pre` and `code` class styles inside [src/index.css](file:///Users/abijith/Desktop/Emotist/Apps/documentation/src/index.css) to customize the color schemes of variable definitions, strings, functions, and keywords.

For example, to change code comment colors:
```css
code .comment {
  color: #718096;
  font-style: italic;
}
```

> [!TIP]
> Make sure to configure the layout and design variables at the top of `src/index.css` first to set matching breakpoints, transition times, and font family chains.

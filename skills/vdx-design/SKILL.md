---
name: vdx-design
description: Use ONLY when the user explicitly asks for Samsung brand styling, names a registered theme like `samsung-kr`, or references samsung.com/sec. Do NOT trigger on generic UI requests — defer to `frontend-design` for those. Generates HTML/CSS using design tokens from a chosen Samsung theme. New themes are discovered automatically from the themes/ directory.
---

# VDX Design

A themed frontend-design skill. Pick a theme by id, then build the requested UI on top of that theme's tokens and component classes. The skill is theme-agnostic — it tells you *how* to compose pages but never hardcodes colors, fonts, or sizes.

## When to use this skill

Trigger when the user says any of:

- "Design a … page" / "Build a … web app" / "Make a … UI" with a Samsung look
- "Match the samsung.com style"
- "Use the `<theme-id>` theme"
- "Generate a hero / product card / landing page in our brand"

Skip for: writing JavaScript logic, implementing backends, or visual changes that don't involve a theme.

## Workflow

```
1. Confirm or pick the theme.
   - If the user named a theme id, use it.
   - Otherwise default to `samsung-kr` (the only theme until others are registered).
   - Verify the directory exists at themes/<id>/.

2. Load the theme's primitives via the public API (do NOT read theme.json directly — that bypasses validation).
   - Run `npm run list:themes` to see registered theme ids.
   - Load the chosen theme through the validator, e.g.:
     `node -e "import('./lib/theme-registry.js').then(m => console.log(JSON.stringify(m.getTheme('<id>'), null, 2)))"`
   - Read themes/<id>/components.css for available classes.
   - Skim themes/<id>/examples/*.html for proven compositions.

3. Compose the page.
   - Start every HTML page with the standard <head> block (see Boilerplate).
   - Build with semantic HTML and the theme's component classes.
   - For one-off styles, reference CSS variables from tokens.css — never literal hex/px values.
   - Lean on the layout primitives in components.css before writing custom CSS.

4. Self-check before delivering.
   - Required imports present? (tokens.css and components.css for the chosen theme.)
   - Any literal colors/fonts/sizes in your HTML? Replace with var(--vdx-…).
   - Mobile-friendly? (Use the .grid-* and .container classes which already break down at the theme breakpoints.)

5. Deliver.
   - Output the file path and the rendered HTML.
   - Mention the theme id used and any token-level deviations.
```

## Boilerplate

Every generated page should start like this. Replace `{{theme.defaultLang}}` with the loaded theme's `defaultLang` (for `samsung-kr` that is `"ko"`; future themes may declare `"en"`, `"en-GB"`, etc.). If `theme.json` omits `defaultLang`, default to `en` in the boilerplate. Replace `{{path-to-theme}}` with the relative path from your generated file to `themes/<id>/` — for a file at `themes/<id>/examples/foo.html` that is `..`; for a file at the repo root it is `themes/<id>`; in general, count the directory hops from the file up to the theme root.

```html
<!DOCTYPE html>
<html lang="{{theme.defaultLang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{Page title}}</title>
  <link rel="stylesheet" href="{{path-to-theme}}/tokens.css">
  <link rel="stylesheet" href="{{path-to-theme}}/components.css">
</head>
<body>
  <!-- page content -->
</body>
</html>
```

## Token usage rules

- **Always reference tokens by CSS variable.** `color: var(--vdx-colors-text-primary);` is right. `color: #1A1A1A;` is wrong, even when the value is correct, because the theme can change.
- **Compose, don't override.** Prefer adding a class from `components.css` over writing new CSS. If you must write new CSS, write it in a `<style>` block at the top of the page and use only token vars inside it.
- **Spacing is on a 4px grid.** Use `--vdx-spacing-1` through `--vdx-spacing-24`. Don't invent intermediate values.
- **Type sizes come from the type scale.** Use `--vdx-typography-font-size-{caption,bodyS..bodyL,h4..h1,displayM..displayXL}`. Don't introduce new sizes.

## Reference files

Read these as needed:

- `references/design-system.md` — How tokens are organized and how to read `theme.json`.
- `references/component-library.md` — Catalog of every `.btn-*`, `.card`, `.product-card`, etc. with markup recipes.
- `references/layout-patterns.md` — Page-level patterns: hero, feature grid, product wall, dense info section, footer.
- `references/typography.md` — Type scale, weight choices, when to use display vs heading vs body.
- `references/theme-extension.md` — How to add a new theme (e.g., `samsung-global`, `harman-luxury`).

## Out of scope

- Generating JS frameworks (React/Vue). Output is HTML+CSS; consumers can adapt.
- Pixel-perfect matching of any specific samsung.com page. We codify the *language*, not specific pages.
- Asset generation (images, icons). Use placeholder boxes with `aspect-ratio` set per the component.

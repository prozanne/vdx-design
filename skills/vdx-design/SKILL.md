---
name: vdx-design
description: Use ONLY when the user explicitly asks for Samsung brand styling, names a registered theme like `samsung-kr`, or references samsung.com/sec. Do NOT trigger on generic UI requests — defer to `frontend-design` for those. Generates AgentX dynamic-UI fragments (`view/index.html`) using design tokens from a chosen Samsung theme. New themes are discovered automatically from the themes/ directory.
---

# VDX Design

A themed frontend-design skill that produces AgentX dynamic-UI fragments. Pick a theme by id, then build the requested UI on top of that theme's tokens and component classes. The skill is theme-agnostic — it tells you *how* to compose UIs but never hardcodes colors, fonts, or sizes.

**Default output mode: AgentX fragment.** Services scaffolded by `create-agentic-service` consume `view/index.html` via `innerHTML` injection — they cannot accept a full HTML document. Read `references/agentx-fragment.md` before generating any UI.

## When to use this skill

Trigger when the user says any of:

- "Design a … panel" / "Build the view for this service" / "Make the AgentX UI"
- "Match the samsung.com style"
- "Use the `<theme-id>` theme"
- "Generate a status / form / dashboard view in our brand"

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
   - Skim themes/<id>/fragments/*.html for proven AgentX-ready compositions.

3. Export the theme into the target service's view/.
   - From the target service repo:
     `node ../vdx-design/lib/export-for-agentx.js --theme <id> --target view`
   - This writes `view/theme/tokens.css` (scoped) and `view/theme/components.css` (scoped),
     and creates a starter `view/index.html` if one doesn't already exist.
   - The scope is `[data-vdx-theme="<id>"]` — selectors will not leak into the AgentX host page.

4. Compose the fragment.
   - Start with `<section data-vdx-theme="<id>">` and end with `</section>` — nothing else at the top level.
   - First two children are the two `<link rel="stylesheet">` tags that load theme/tokens.css and theme/components.css.
   - Build with semantic HTML and the theme's component classes.
   - All dynamic values use data-bind / data-bind-html. All action buttons use data-action="tool_call" + data-tool="<service-id>.<tool>".
   - No <script>, no inline onclick=, no <html>/<head>/<body>.
   - For one-off styles, reference CSS variables from tokens.css — never literal hex/px values.

5. Self-check before delivering.
   - Single <section> at top level? Two <link> tags first?
   - No <!DOCTYPE> / <html> / <body> / <script> / inline handlers?
   - Every dynamic text has data-bind, every dynamic HTML has data-bind-html, every action button has data-action + data-tool?
   - Any literal colors/fonts/sizes? Replace with var(--vdx-…).
   - Panel-friendly? (AgentX panels are 600–900px wide. Avoid full-bleed .hero and .nav-bar.)

6. Deliver.
   - Output the file path (typically `view/index.html`) and the rendered fragment.
   - Mention the theme id used, the export command if it hasn't been run yet, and any token-level deviations.
```

## Boilerplate

Every generated fragment looks like this. Replace `<theme-id>` with the chosen theme (for example `samsung-kr`) and `<service-id>` with the service's id from `harness.json`.

```html
<section data-vdx-theme="<theme-id>">
  <link rel="stylesheet" href="theme/tokens.css">
  <link rel="stylesheet" href="theme/components.css">

  <header class="stack">
    <p class="caption" data-bind="status_label">대기 중</p>
    <h1 class="display-m" data-bind="page_title">Service title</h1>
  </header>

  <!-- meaningful sections: status display, input forms, action surfaces -->
</section>
```

The scoped `theme/tokens.css` and `theme/components.css` are produced by the export script (see Workflow step 3). Read `references/agentx-fragment.md` for the complete attribute contract (`data-bind`, `data-bind-html`, `data-action`, `data-tool`, `data-args`) and common patterns.

## Decision flow (A/B 시각 비교)

When the user's request has a meaningful taste choice with no objectively right answer (card density, button emphasis, layout split), do NOT silently pick — let the user decide visually with `vdx-decide`.

When to invoke:
- 두 변형이 모두 합리적이고, 객관적 우열이 없음 (단순 a11y/스펙 위반 결정은 그냥 알아서 해결).
- 사용자의 fragment에 핵심 시각 요소가 걸려있음 (CTA 강조, 카드 레이아웃 등).
- 한 세션에서 2회 이하 — 남용 금지.

Procedure:
1. Generate two variant `<section>` fragments (same shape as the final output). Save them to `.vdx-decisions/<topic>-a.html` and `.vdx-decisions/<topic>-b.html`. Both variants must already use only `var(--vdx-...)` tokens.
2. Run via Bash:
   ```
   npx vdx-decide --topic <topic> --question "<짧은 한국어 질문>" --a .vdx-decisions/<topic>-a.html --b .vdx-decisions/<topic>-b.html
   ```
   The CLI starts a tiny HTTP server on a free port, opens the user's browser to a side-by-side comparison, and waits for the user to click. It prints **only** `A` or `B` to stdout, then exits 0. On timeout (default 600s) it exits 1 with no stdout.
3. Read the stdout result. Apply the chosen variant directly to the page being generated. Annotate with a comment: `<!-- decision: <topic> = <choice> via vdx-decide -->`.
4. Continue the conversation acknowledging the chosen variant. Do not show the user the rejected variant unless they ask.

Options: `--theme <id>` (default `samsung-kr`), `--port <n>` (default auto), `--timeout <secs>` (default 600).

## Token usage rules

- **Always reference tokens by CSS variable.** `color: var(--vdx-colors-text-primary);` is right. `color: #1A1A1A;` is wrong, even when the value is correct, because the theme can change.
- **Compose, don't override.** Prefer adding a class from `components.css` over writing new CSS. If you must write new CSS, write it in a `<style>` block at the top of the page and use only token vars inside it.
- **Spacing is on a 4px grid.** Use `--vdx-spacing-1` through `--vdx-spacing-24`. Don't invent intermediate values.
- **Type sizes come from the type scale.** Use `--vdx-typography-font-size-{caption,bodyS..bodyL,h4..h1,displayM..displayXL}`. Don't introduce new sizes.

## Reference files

Read these as needed:

- `references/agentx-fragment.md` — **Read first.** The fragment output contract: required skeleton, allowed attributes (`data-bind` / `data-bind-html` / `data-action` / `data-tool` / `data-args`), banned constructs (`<script>`, inline handlers), runtime events (`show_template`, `data_update`, `tool_result`), and common patterns.
- `references/design-system.md` — How tokens are organized and how to read `theme.json`.
- `references/component-library.md` — Catalog of every `.btn-*`, `.card`, `.product-card`, etc. with markup recipes. Note: panel-unfriendly components (`.hero`, `.nav-bar`, `.footer`) exist but are rarely useful inside an AgentX panel.
- `references/layout-patterns.md` — Layout patterns. For AgentX fragments lean on the card/grid/stack patterns; the hero/footer patterns are reserved for full-page exports.
- `references/typography.md` — Type scale, weight choices, when to use display vs heading vs body.
- `references/theme-extension.md` — How to add a new theme (e.g., `samsung-global`, `harman-luxury`).

## Out of scope

- Generating JS frameworks (React/Vue). Output is an HTML fragment; the AgentX runtime owns event delegation.
- Implementing tools or `harness.json`. That belongs to the `create-agentic-service` workflow. This skill only fills `view/index.html` and the supporting `view/theme/*.css` files.
- Full-page output (`<html>`/`<head>`/`<body>`). The AgentX runtime injects via `innerHTML` and would discard the document wrapper. If the user genuinely needs a full page, that's outside this skill's mandate.
- Pixel-perfect matching of any specific samsung.com page. We codify the *language*, not specific pages.
- Asset generation (images, icons). Use placeholder boxes with `aspect-ratio` set per the component.

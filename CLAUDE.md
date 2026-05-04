# vdx-design — Claude orientation

This repo is a Claude skill that dresses AgentX dynamic-UI fragments in a registered Samsung theme. Read this file before working — the actual consumer constraint changes how everything is shaped.

## Mission

The skill produces **AgentX fragments**, not full HTML pages. The downstream consumer is `../toolkit/create-agentic-service/`, which scaffolds services whose `view/index.html` is injected into a host page via `innerHTML`. A full `<!DOCTYPE>`/`<html>`/`<body>` document would be discarded by the runtime. The skill's primary output is therefore:

```html
<section data-vdx-theme="<theme-id>">
  <link rel="stylesheet" href="theme/tokens.css">
  <link rel="stylesheet" href="theme/components.css">
  <!-- content using var(--vdx-...) and component classes only -->
</section>
```

No `<script>`, no inline `on*=` handlers — the AgentX runtime owns event delegation via `data-action`/`data-tool`/`data-args` and renders dynamic values through `data-bind`/`data-bind-html`. The full contract lives in `skills/vdx-design/references/agentx-fragment.md` — read it before generating UI.

## File layout

- `skills/vdx-design/` — skill instructions. Theme-agnostic. `SKILL.md` + `references/`.
- `themes/<id>/` — one theme per directory. `theme.json` is the source of truth; `tokens.css` is generated; `components.css` is hand-written; `fragments/` holds AgentX-ready compositions; `examples/`/`playgrounds/` hold full-page references for designers.
- `lib/`
  - `theme-loader.js` — validates `theme.json` against `themes/theme-schema.json` (no external deps; hand-rolled validator).
  - `theme-registry.js` — enumerates themes, resolves by id. Use `getTheme(id)` from this rather than reading `theme.json` directly.
  - `token-to-css.js` — generates `tokens.css` from `theme.json` (`npm run build:tokens [-- themes/<id>]`).
  - `export-for-agentx.js` — copies a theme's `tokens.css` + `components.css` into a target service's `view/theme/`, scoping every selector to `[data-vdx-theme="<id>"]`. Also writes a starter `view/index.html` if one doesn't exist (`--force` to overwrite).
- `tests/` — `node --test` suites. No external test framework.

## How CSS scoping works (export-for-agentx)

The export script's job is to make a theme safe for `innerHTML` injection. Selectors are rewritten so the theme cannot leak onto the host page:

- `:root` → `[data-vdx-theme="<id>"]`
- `body` (alone or as a prefix) → the scope itself
- `html` selectors are dropped entirely (host owns `<html>`)
- everything else gets prefixed with the scope
- `@media` / `@supports` / `@container` bodies are recursed into

This is regex-aware (handles bracket attribute selectors like `[role="button"]:focus` so commas inside don't split a list) but is not a full CSS parser. Stay within the patterns already used in `themes/samsung-kr/components.css`. Tests in `tests/export-for-agentx.test.js` pin the behavior.

## Toolkit integration

The workflow at `../toolkit/create-agentic-service/distributionTemplate/.clinerules/workflows/create-agentic-service.md` is the source of truth. After editing it, run `npm run sync:templates` from `../toolkit/create-agentic-service/` to propagate to `distribution/`, `../service-js-template/`, and `../service-python-template/`. The toolkit's `npm test` includes a sync check, so out-of-sync states fail loudly.

When a generated service opts into a vdx-design theme, the workflow tells it to run:

```
node ../../vdx-design/lib/export-for-agentx.js --theme <id> --target view
```

That single command populates `view/theme/tokens.css`, `view/theme/components.css`, and (if missing) a starter `view/index.html`.

## Token rules (non-negotiable)

- Always reference tokens by CSS variable: `color: var(--vdx-colors-text-primary)`. Literal `#1A1A1A` is wrong even when the value is correct.
- Spacing comes from `--vdx-spacing-1` … `--vdx-spacing-24` (4px grid). Don't invent intermediate values.
- Type sizes come from `--vdx-typography-font-size-{caption,bodyS..bodyL,h4..h1,displayM..displayXL}`.
- No external font CDNs. The `samsung-internal-github-only` policy applies; rely on system fallbacks.

## Adding a theme

`cp -r themes/samsung-kr themes/<new-id>` → edit `theme.json` (`id`, `name`, `defaultLang`, brand tokens) → `npm run build:tokens -- themes/<new-id>` → replace `examples/`/`fragments/` content → add a row in `themes/REGISTRY.md` → `npm test`.

## Tests and running

- `npm test` runs `node --test` over `tests/`.
- `npm run list:themes`, `npm run build:tokens`, `npm run decide` (A/B visual decision CLI).
- **Known Windows issue:** `theme-registry.test.js` and `samsung-theme.test.js` have pre-existing failures from path-separator assumptions (`themes/<id>` vs `themes\<id>`). Not related to recent fragment work; fix is one-line `path.sep` normalization but hasn't been done yet.
- **CLI quirk:** `lib/token-to-css.js` and `lib/theme-registry.js` use `import.meta.url === \`file://${process.argv[1]}\`` to detect direct invocation, which never matches on Windows (forward vs back slashes). `lib/export-for-agentx.js` uses `pathToFileURL(process.argv[1]).href` which works cross-platform. The two older files should be migrated when convenient.

## Out of scope for this skill

- Generating React/Vue components — output is HTML+CSS fragments.
- Implementing tools or `harness.json` — that's the toolkit's job.
- Pixel-perfect samsung.com replication — we capture the *language*, not specific pages.
- Full-page output — if a user genuinely needs a standalone web page, that's outside the skill.

## Don'ts

- Don't read `themes/<id>/theme.json` directly with `JSON.parse` — go through `getTheme(id)` so validation runs.
- Don't add external dependencies. The repo has been kept dep-free intentionally; both validator and CSS scoper are hand-rolled.
- Don't write component CSS with `body` / `html` / `*` global selectors as the *primary* form — they'll be transformed by the export script, but reviewing the diff is awkward. Prefer class-based selectors from the start.
- Don't introduce a CLAUDE.md, README.md, or docs file unless asked. This file exists to orient Claude; the README and existing reference docs are for humans.

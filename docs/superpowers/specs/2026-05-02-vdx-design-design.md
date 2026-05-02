# vdx-design — Themed Frontend Design Skill

**Date:** 2026-05-02
**Owner:** Samsung VDX
**Status:** Approved (proceeding to implementation)

## Goal

Build an internal Claude skill, modeled after Anthropic's `frontend-design` skill, that helps a designer or engineer generate web pages and components matched to a registered visual theme. The first theme reproduces the look-and-feel of `https://www.samsung.com/sec/`. The architecture must support additional themes added later without changing the skill's core instructions.

## Non-goals

- Reverse-engineering Samsung's proprietary fonts. We reference them by name and supply open-source / system fallbacks.
- Replicating Samsung's CMS or data layer.
- Pixel-perfect copying of any single Samsung page. We codify the design *language* (tokens, patterns, components), not specific pages.

## Architecture

The skill is split into three layers:

1. **Skill instructions (`skills/vdx-design/`)** — Markdown files Claude reads when the skill is invoked. These are theme-agnostic; they explain the design philosophy, how to use design tokens, what components exist, and how to compose pages.
2. **Theme registry (`themes/`)** — Each theme is a self-contained directory. A theme contributes:
   - `theme.json` — the canonical design tokens (color, typography, spacing, radius, shadow, motion, breakpoints, components).
   - `tokens.css` — generated CSS-variable file mirroring `theme.json`, ready to drop into a page.
   - `components.css` — pre-styled component classes (`.btn-primary`, `.card`, `.nav-bar`, …).
   - `examples/*.html` — reference pages demonstrating the theme in use.
   - `README.md` — theme docs (provenance, brand notes, usage tips).
3. **Tooling (`lib/`)** — Small Node utilities used by tests and by the theme-extension workflow:
   - `theme-loader.js` validates a `theme.json` against `themes/theme-schema.json`.
   - `token-to-css.js` derives `tokens.css` from `theme.json` so the two never drift.
   - `theme-registry.js` enumerates available themes and looks one up by id.

### Why this split?

- **Adding a theme is a directory drop**, not a code change. A new theme contributor copies `themes/samsung-kr/`, edits `theme.json`, regenerates `tokens.css`, replaces example pages, and registers it in `themes/REGISTRY.md`.
- **The skill instructions stay stable.** They reference tokens by *role* (`color.brand.primary`, `font.size.display.l`), never by literal value. Switching themes changes the rendered look without changing what Claude says.
- **Tests guard the schema.** Every theme is automatically validated against `theme-schema.json`. CI catches missing tokens.

## Design tokens (theme.json shape)

The token tree is fixed by the schema. Every theme MUST provide values for every leaf. Categories:

- `colors.brand` — primary, primaryHover, secondary, accent
- `colors.neutral` — 0, 50, 100, 200, 300, 500, 700, 900, 1000 (light → dark)
- `colors.semantic` — success, warning, danger, info
- `colors.surface` — page, card, elevated, inverse
- `colors.text` — primary, secondary, muted, onBrand, onInverse
- `colors.border` — subtle, default, strong, inverse
- `typography.fontFamily` — sans, display, mono
- `typography.fontSize` — caption, bodyS, bodyM, bodyL, h4, h3, h2, h1, displayM, displayL, displayXL
- `typography.lineHeight` — tight, normal, relaxed
- `typography.fontWeight` — regular, medium, semibold, bold
- `typography.letterSpacing` — tight, normal, wide
- `spacing` — 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 (multiples of 4px)
- `radius` — none, sm, md, lg, pill
- `shadow` — none, sm, md, lg
- `motion.duration` — fast, base, slow
- `motion.easing` — standard, emphasized
- `breakpoints` — mobile, tablet, laptop, desktop, xl
- `components.button` — height, paddingX, radius, fontWeight
- `components.input` — height, paddingX, radius, borderColor
- `components.card` — padding, radius, shadow
- `components.nav` — height, background, color
- `components.footer` — background, color

Tokens are always referenced by *role* in the skill instructions, e.g. "Use `color.brand.primary` for primary CTAs" — never "Use `#1428A0`".

## Samsung Korea theme

Tokens chosen to evoke samsung.com/sec without claiming pixel match:

- **Color** — black-dominant nav and primary CTA (`#000`), Samsung blue (`#1428A0`) reserved for accent/highlight, full-spectrum neutrals, sparing red `#E12832` for promo badges.
- **Typography** — heading-heavy "display" scale (up to 80px), `SamsungOne`/`SamsungSharpSans` named first with Korean (`Pretendard`, `Noto Sans KR`) and Latin system fallbacks. Tight letter-spacing on display sizes.
- **Layout** — generous max-widths (1440 content, full-bleed heroes), 8-point spacing grid, mostly-flat shadows, pill-shaped primary buttons.
- **Tone** — premium, minimal, photo-led; product imagery does the heavy lifting; type and chrome stay quiet.

## Generation flow

When a user asks the skill to "build a Samsung-styled product landing page":

1. Claude reads `SKILL.md`, which directs it to consult `references/` and the requested theme directory.
2. Claude inspects `themes/samsung-kr/theme.json` and `components.css` for available primitives.
3. Claude composes the requested page using token-referenced classes from `components.css` plus inline tokens for one-off styles.
4. The output HTML imports `tokens.css` and `components.css` so it renders correctly when opened in a browser.

If the user asks for a different theme (future), the same flow runs against that theme's directory.

## Extensibility — adding a new theme

Documented in `references/theme-extension.md`:

1. `cp -r themes/samsung-kr themes/<new-id>`.
2. Edit `theme.json` (id, name, version, tokens).
3. Run `node lib/token-to-css.js themes/<new-id>` → regenerates `tokens.css`.
4. Replace example HTML with theme-appropriate references.
5. Append a row to `themes/REGISTRY.md`.
6. Run `npm test` — the schema check + extensibility fixture test covers the new theme automatically.

## Tests

- `theme-loader.test.js` — invalid JSON rejected; missing required tokens rejected; valid theme accepted.
- `theme-registry.test.js` — registry lists themes from disk; `getTheme(id)` returns parsed theme; unknown id throws.
- `samsung-theme.test.js` — `themes/samsung-kr/theme.json` validates against the schema and supplies every documented role.
- `examples-render.test.js` — every example HTML in `themes/*/examples/` parses, references `tokens.css`, and contains no broken local links.
- `extensibility.test.js` — a fixture theme at `tests/fixtures/test-theme/` passes validation, proving the registry mechanism works for non-Samsung themes.

Tests run with Node's built-in test runner (`node --test`). No external test deps.

## Out of scope (for v1)

- Generating React/Vue components (we ship plain HTML/CSS reference output; consumers can adapt).
- Dark-mode variants of the Samsung theme (token shape supports it; deferred).
- Internationalization beyond Korean+English in font stacks.
- A CLI for theme creation (the directory copy is the CLI).

## Risks

- **Font licensing** — `SamsungOne` is proprietary. We reference it by name with permissive fallbacks; rendering on machines without the font falls through to system fonts. Documented in the theme README.
- **Brand drift** — As samsung.com/sec evolves, the captured tokens age. The version field in `theme.json` plus the registry row gives us a refresh hook.

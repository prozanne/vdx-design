---
date: 2026-05-03
reviewer: a11y-security-critic
scope: themes/samsung-kr/examples/{landing,nav-footer,product-detail}.html, lib/{theme-loader,theme-registry,token-to-css}.js, skills/vdx-design/SKILL.md
---

# VDX Design — Accessibility & Security Review

Adversarial review of the example pages and the JS theme pipeline. Findings are tagged by severity:

- **CRITICAL** — must fix; blocks shipping or violates WCAG AA hard.
- **HIGH** — high-impact a11y or security risk; fix before next release.
- **MEDIUM** — clear violation, modest user impact.
- **LOW** — best-practice gap, polish, or defense-in-depth.
- **INFO** — observation; not actionable on its own.

---

## Accessibility Findings

### A11Y-01 — Heading hierarchy skipped in `landing.html` (HIGH)

In `themes/samsung-kr/examples/landing.html` the newsletter section drops from `h2` (line 80, "인기 제품") directly to `h3` (line 143, "뉴스레터 구독") inside its own card after a section break. That is acceptable. However, **`product-detail.html` skips levels in the opposite direction**:

- The page `h1` is "Galaxy Z Flip6" (line 72, `display-m` class).
- The price is rendered as `<h2>1,499,000원</h2>` (line 97) — *price as a heading is a structural lie*; a price is not a section landmark and screen-reader users will get a "heading 2" announcement that does not correspond to a navigable section.
- "핵심 사양" `<h2>` (line 119) sits at sibling level to the price `h2`, which means SR users reading the heading outline see two h2s on the same level with very different semantic weight.

Recommendation:
- Demote the price `h2` to a `<p class="display-m">` or `<div class="display-m" role="text">`. Use a styling class, not a heading.
- The "핵심 사양" `h2` is the only legitimate h2 on this page.

### A11Y-02 — `nav-footer.html` orphan footer headings (`h4` with no `h1/h2/h3`) (HIGH)

`nav-footer.html` has only one `h1` ("Navigation & Footer") in `<main>`. The footer then jumps to four `<h4>` elements (lines 41, 50, 58, 66). WCAG SC 1.3.1 (Info & Relationships) and SC 2.4.6 (Headings & Labels) expect headings to flow without skipping: `h1 → h4` is a 2-level skip. `landing.html` shares the same defect (lines 158, 168, 177, 186 — all `h4` after section h2/h3s; the skip from h3 to h4 is acceptable, but the column structure does not justify h4 specifically — `h3` would be correct given the parent footer is a navigation landmark, not nested under another h2 section).

Recommendation: Promote footer column titles to `<h2>` (treat the footer as a top-level landmark with sibling headings to `<main>`'s headings) or `<h3>` if you keep the visual hierarchy. The semantics should match the document outline, not the visual size.

### A11Y-03 — Color swatches are not keyboard-operable (CRITICAL)

In `product-detail.html` lines 79–82, the four color swatches are `<span>` elements with `aria-label` only. They are visually depicted as selectable controls (the "selected" swatch has an outline ring, line 20–23 in the inline `<style>`), but:

- A `<span>` is not in the tab order.
- There is no `role="radio"`, no `tabindex="0"`, no `aria-checked`, no event handler.
- A keyboard user cannot select a color. A screen-reader user hears "Mint", "Black", "Blue", "Pink" with no role announcement.

This fails WCAG SC 2.1.1 (Keyboard) and SC 4.1.2 (Name, Role, Value).

Recommendation: Wrap the group in `<fieldset role="radiogroup" aria-label="색상">` (or use ARIA without fieldset) and render each swatch as `<button role="radio" aria-checked="true|false" tabindex="0|-1">` with a roving tabindex pattern. Use `:focus-visible` for the outline ring (already token-styled via `--vdx-colors-brand-accent`). Even as a *demo*, this teaches the wrong pattern — and the SKILL.md tells consumers to skim the examples for proven compositions, so this defect propagates.

### A11Y-04 — Storage capacity selector uses `<a href="#">` for non-navigation control (HIGH)

Lines 89–91 of `product-detail.html`:

```html
<a class="btn btn-secondary btn-sm" href="#">256GB</a>
<a class="btn btn-ghost btn-sm" href="#">512GB</a>
<a class="btn btn-ghost btn-sm" href="#">1TB</a>
```

A storage-capacity selector is a *control*, not a link. The current markup:
- Sends keyboard users to a `#` anchor that scrolls the page (focus jumps to the document top).
- Lies to screen readers (announces "link" instead of "button" or "radio").
- Does not surface the *selected* state. The `btn-secondary` vs `btn-ghost` class distinguishes selected visually, but no `aria-pressed` / `aria-checked` is exposed.

Recommendation: Same pattern as the swatches — `role="radiogroup"` with `<button role="radio" aria-checked>`. If you keep buttons, at minimum use `<button type="button" aria-pressed="true|false">` instead of `<a href="#">`.

### A11Y-05 — "전체 보기 →" arrow announced as text (MEDIUM)

Line 81 of `landing.html`: `<a class="btn btn-link" href="#">전체 보기 →</a>`. The "→" character is announced literally by VoiceOver/NVDA ("right-arrow", "오른쪽 화살표" in Korean SR) and TalkBack reads U+2192 as a code point or as an English glyph name. This is noise for SR users.

Recommendation: Wrap it in `<span aria-hidden="true">→</span>`, or use a CSS `::after` pseudo-element with `content: "→"` (decorative content in pseudo-elements is correctly ignored by most modern SRs).

### A11Y-06 — Newsletter `<input>` lacks accessible affordance to submit (HIGH)

Lines 145–147 of `landing.html`:

```html
<label class="label" for="email">이메일</label>
<input id="email" class="input" type="email" placeholder="you@example.com">
<a class="btn btn-primary mt-8" href="#">구독하기</a>
```

Issues:
1. No `<form>` wrapping the input + submit. Pressing Enter inside the email field does nothing — implicit form submission is broken.
2. The "구독하기" submit affordance is `<a href="#">`, not `<button type="submit">`. Activating it will scroll the page rather than submit.
3. No `required`, no `aria-describedby` for error messaging, no `autocomplete="email"`.
4. The placeholder "you@example.com" is not a label substitute (good — there's a real `<label>`), but the placeholder color is implementation-dependent and frequently fails contrast.

Recommendation: Wrap in `<form action="..." method="post">`. Use `<button type="submit" class="btn btn-primary">`. Add `autocomplete="email"` and `required`. Pre-allocate space for an error message via `aria-describedby`.

### A11Y-07 — `text-muted` (#767676 on #FFFFFF) sits at the WCAG AA edge (MEDIUM)

`tokens.css` defines `--vdx-colors-text-muted: #767676`. Contrast against the canvas (white): **4.54:1**. This *passes* AA for body text (≥4.5:1) by 0.04. Any future tokens shift, any non-default background, or any user-side gamma adjustment risks dropping it below the threshold. Multiple paragraphs use this color (`landing.html` lines 53, 58, 63, 73, 119, 144; `product-detail.html` lines 73, 124, 129, 134, 139, 144, 149; etc.).

Of practical concern: **`product-detail.html` lines 106–110** apply `body-s` *and* `text-muted` together to the bullet list. Smaller-than-body text at #767676 fails AA the moment it drops below 18.66px (24px regular ≅ 18pt is the bold large-text threshold; for normal weight it's 24px). The `body-s` size in this theme is presumably 14–15px. **This is an AA contrast failure.**

Recommendation: Either (a) darken `--vdx-colors-text-muted` to ≥#595959 (4.91:1, comfortable margin), or (b) forbid `text-muted` on `body-s`/`caption` sizes via documentation and add a lint rule.

### A11Y-08 — Inverse hero section ("어디든 가능합니다") contrast unverified (MEDIUM)

`landing.html` line 69: `<section class="section surface-inverse text-center">`. The styling depends on `--vdx-components-section-inverse-bg` and `--vdx-components-section-inverse-color` (or similar). Without seeing those tokens (not on the read list), I can't certify AA. **Action**: verify the inverse pairing is ≥4.5:1 for body text and ≥3:1 for the `display-m`. The "btn-accent" CTA on the dark background also needs ≥4.5:1 between its text and the button background, AND ≥3:1 between its background and the page background (so the button outline is perceivable).

### A11Y-09 — `<article class="product-card">` has no accessible name (MEDIUM)

`landing.html` lines 85, 98, 111, 124. Each `<article>` is a landmark in modern AT (NVDA/JAWS expose articles in the landmark list). With no `aria-labelledby` or `aria-label`, the AT announces only "article". The product name `<div class="name">` lines (91, 104, 117, 129) are not headings, so they do not become the implicit accessible name.

Recommendation: Either change `<div class="name">` to `<h3 class="name">` (which would also fix A11Y-01's hierarchy on this page — h2 → h3) and add `aria-labelledby` on the article, or label the article: `<article class="product-card" aria-labelledby="prod-zflip6">` with `<div id="prod-zflip6" class="name">Galaxy Z Flip6</div>`.

### A11Y-10 — `<img alt="Galaxy Z Flip6">` is product-name-only (LOW)

The placeholder images use the product name as alt text. For real product imagery on a real samsung.com page, the product name is *also* announced as the visible product `<h3>`/`<div class="name">`, leading to "Galaxy Z Flip6, image, Galaxy Z Flip6" double-reads. Either:

- Decorative on the card (`alt=""`), since the name is right next to it; or
- A *descriptive* alt that adds info ("Galaxy Z Flip6 in Mint, opened to camera view"). The current "alt=product name" is the worst of both worlds.

For the placehold.co URLs this is a demo concern only, but the SKILL.md examples are templates consumers copy.

### A11Y-11 — `<html lang="ko">` is correct, but mixed-language strings are unmarked (MEDIUM)

All three pages declare `lang="ko"` correctly. However, several strings are English embedded in Korean prose, and they should carry `lang="en"` so a Korean TTS doesn't try to read them with Korean phonology:

- `landing.html` line 35: `<div class="hero-eyebrow">Galaxy Z Flip6</div>` (brand name, defensible to leave; "Galaxy AI" line 37 same)
- `landing.html` lines 91, 104, 117, 129: product names in English
- `landing.html` line 14, 24, 25: "SAMSUNG", "검색"/"로그인" mix
- `product-detail.html` line 123, 128: "6.7" Dynamic AMOLED 2X", "Snapdragon 8 Gen 3 for Galaxy"
- `product-detail.html` lines 79–82: `aria-label="Mint"`, `aria-label="Black"`, etc. — the screen reader reads English aria-labels with Korean voice. Either provide Korean equivalents ("민트", "블랙", "블루", "핑크") or wrap in `<span lang="en">`.

Per KWCAG 2.2 (검사 항목 14: 기본 언어 표시) and WCAG SC 3.1.2 (Language of Parts), language switches should be marked. Korean a11y audits commonly flag this.

### A11Y-12 — Footer aria-label "푸터" on `<nav>` is redundant (LOW)

`landing.html` line 156, `nav-footer.html` line 39: `<nav aria-label="푸터" class="grid grid-4">`. The `<footer>` element above it is already a `contentinfo` landmark, and the `<nav>` inside it is announced as "navigation". "푸터" (literally "Footer") duplicates the landmark name. A more useful aria-label distinguishes purpose: `aria-label="사이트맵"` or `aria-label="법적 정보 및 사이트맵"`.

Per the same reasoning, the top `<nav aria-label="주요 메뉴">` is fine — it labels by purpose.

### A11Y-13 — `:focus-visible` outline color is the same as a brand color (LOW)

`components.css` line 272: `outline: 2px solid var(--vdx-colors-brand-accent);` where `--vdx-colors-brand-accent: #2189FF`. On a white background that's a 4.06:1 ratio; for non-text UI components WCAG SC 1.4.11 requires ≥3:1, so it passes — but on the `surface-inverse` dark section the contrast against the dark background needs to be re-verified, and on a hovered `btn-primary` (#000 background) the blue outline at offset 2px should be confirmed. A lighter accent or a contrasting outline color (e.g., `currentColor` with high-contrast fallback) would be more robust across surfaces.

### A11Y-14 — Reduced motion handling is correct (POSITIVE)

`components.css` lines 546–559 honors `prefers-reduced-motion: reduce` and squashes durations to 0.01ms while disabling card lifts. This is best-practice. **Keep this.** No finding.

### A11Y-15 — `<input>` placeholder doubling as helper text risk (LOW)

`landing.html` line 146: `placeholder="you@example.com"`. Placeholders disappear on focus; users with cognitive impairments lose the format hint. Consider adding `aria-describedby` pointing to a visually-rendered helper, or a persistent format hint outside the input.

### A11Y-16 — No skip-to-main-content link (MEDIUM)

None of the three pages provide a `<a href="#main" class="skip-link">` as the first focusable element. WCAG SC 2.4.1 (Bypass Blocks) requires a mechanism to skip repeated content. Keyboard-only users must tab through every nav link on every page.

Recommendation: Add a skip-link pattern to `components.css` and include it as the first child of `<body>` in the boilerplate (SKILL.md should mention this).

### A11Y-17 — Form labels' `class="label"` not verified for visual prominence (LOW)

The label on line 145 of `landing.html` is wired correctly with `for="email"`. Confirm the visual `.label` rule in `components.css` is at a contrast ≥4.5:1 and is not styled as `font-size: 0` or `display: none` (which would hide the visual label and break SC 3.3.2 Labels or Instructions). Quick read of components.css did not surface a `.label` rule in the snippets I sampled — verify it exists and is styled.

### A11Y-18 — `<a class="nav-brand" href="/" aria-label="Samsung 홈">SAMSUNG</a>` (POSITIVE)

The brand link has an explicit aria-label that disambiguates "SAMSUNG" (which a Korean SR might say in English) and conveys destination ("홈"). Good pattern.

---

## Security Findings

### SEC-01 — Path traversal possible via `themesDir` parameter, not just `id` (MEDIUM)

`lib/theme-registry.js` `getTheme(id, themesDir = DEFAULT_THEMES_DIR)` validates the *id* against `^[a-z0-9][a-z0-9-]*$` (lines 37–45) — good. **But `themesDir` is unvalidated**. A consumer that exposes this function (or the loader CLI) to user-controlled input could pass a `themesDir` like `/etc` and a crafted `id` like `passwd-d` (no, must contain only lowercase letters/digits/hyphens — the id pattern actually constrains this), but more realistically: a `themesDir` of `/etc/cron.d` or any directory the process can read. The loader calls `loadTheme(dir)` which calls `readFileSync(join(themeDir, "theme.json"))`. If a target directory has a file named `theme.json`, this reads and parses it.

Today this is reachable only by code that already trusts the caller (npm script, CLI argv). However:
- `lib/token-to-css.js` line 124 takes `process.argv[2]` as a theme directory and passes it through `resolve(themeDir)` — *no validation*. An attacker who can influence argv (e.g., a CI step that takes a job-name parameter) can target arbitrary directories.

**Recommendation**: After resolving `themesDir`, assert that it is within a known-safe ancestor (`path.resolve(themesDir).startsWith(REPO_ROOT)` style check, plus reject symlinks via `fs.realpathSync` comparison). At minimum, document that `themesDir` is a *trust boundary* — the contract today is implicit.

### SEC-02 — `lib/token-to-css.js` writes to the resolved theme dir without validation (HIGH)

`buildTokensCss(themeDir)` (line 114) takes a path and **unconditionally writes** to `join(themeDir, "tokens.css")` (line 118) using `writeFileSync`. The CLI branch (lines 122–141) uses `process.argv[2]`. Combined with SEC-01, this is an arbitrary-file-write primitive: `node lib/token-to-css.js /tmp/attacker-controlled` will create `/tmp/attacker-controlled/tokens.css` containing whatever CSS the parsed `theme.json` produced.

The CSS_SAFE_VALUE regex (line 27, `/^[^;{}<>\n\r]+$/`) prevents CSS injection *inside* a value, but does not constrain the *output path*. An attacker who can drop a malicious `theme.json` and influence the CLI arg can force a write to any directory.

Recommendation: In `buildTokensCss`, verify `themeDir` is a directory inside `DEFAULT_THEMES_DIR` (or an explicitly allowlisted root). Reject paths with `..` segments or symlinks.

### SEC-03 — `CSS_SAFE_VALUE` allows `*/` and CSS injection via comment-close (HIGH)

`lib/token-to-css.js` line 27: `const CSS_SAFE_VALUE = /^[^;{}<>\n\r]+$/`. This blocks `;`, `{`, `}`, `<`, `>`, and newlines, but **does not block `/*` or `*/`**. The generated header is a CSS comment:

```
/* Generated by lib/token-to-css.js — do not edit by hand. */
/* Theme: ${theme.id} (${theme.name}) v${theme.version} */
```

`theme.id` is constrained by the schema pattern, but **`theme.name` and `theme.version` are interpolated raw into a comment**. A malicious `name` of `evil */ body{display:none}/*` would close the comment and inject CSS. Same applies to `version`. The schema patterns at `themes/theme-schema.json` would need to be checked for these fields specifically.

Even worse, *token values* aren't comments — they're values. A value like `red */ background: url(http://evil) /*` would not contain `;{}<>` and would pass `CSS_SAFE_VALUE`, but would close any surrounding comment if a downstream tool wraps the var in a comment for tooling. It also allows `var(--something)` which can resolve to anything at use-time (the loader already documents this on line 18).

Token values can also contain backslash escapes (`\3a`) and `url(...)` directives. `url(javascript:...)` is blocked in modern browsers in CSS contexts, but `url(data:text/html,...)` for `background-image` is a phishing/exfil concern in some contexts.

Recommendation:
- Allowlist CSS values by structure rather than just blocklist a few characters. At minimum, also reject `/*`, `*/`, and `\` (backslash escapes are rarely needed in design-token values).
- Validate `theme.name` and `theme.version` strictly (the schema may already; verify).
- Consider escaping `*/` in comment lines, or use a regex-based output strategy that strips dangerous sequences before writing.

### SEC-04 — `JSON.parse(readFileSync(...))` does not bound input size (MEDIUM)

`lib/theme-loader.js` line 30 (schema), line 201 (theme): both call `JSON.parse(readFileSync(path, "utf8"))` with no size cap. A 1GB `theme.json` will be loaded into memory before validation. The `MAX_STRING_LENGTH = 10000` only applies to *individual string values inside the object*, not the whole file.

Recommendation: `fs.statSync(path).size` check before reading; bound at, say, 1MB. Same applies to `SCHEMA_PATH` (though that's a checked-in file, not user input).

### SEC-05 — `matchesPattern` accepts arbitrary regex source from schema (MEDIUM)

`lib/theme-loader.js` line 61: `re = new RegExp(pattern)`. The `pattern` comes from the schema. The canonical schema is checked in, but the validator accepts a `customSchema` parameter (line 190) "for tests" — and tests are not the only consumer who might use it.

Catastrophic-backtracking patterns like `(a+)+$` against a long string can stall the event loop. The bounded `MAX_STRING_LENGTH = 10000` *limits* the damage but does not prevent a 10s pause on a hostile pattern.

Recommendation:
- Wrap regex compilation in a try/catch and reject patterns with unbounded backtracking heuristics.
- Or use a non-backtracking engine (the new `RegExp` `v` flag does not solve ReDoS).
- If the only callers are trusted (canonical schema + tests), document that explicitly and never expose `customSchema` outside the package boundary.

### SEC-06 — TOCTOU: `existsSync` then `readFileSync` (LOW)

`lib/theme-registry.js` line 47: `if (!existsSync(join(dir, "theme.json")))` then `loadTheme(dir)` calls `readFileSync` (theme-loader.js line 201). Between these two calls, the file could be removed or replaced via a race. In a single-process build pipeline this is academic; in a long-running daemon (e.g., a hosted version) a malicious local user could swap the file.

Recommendation: Drop the `existsSync` and let `readFileSync` throw `ENOENT`, then convert that to the friendly "Unknown theme" error. Also reduces attack surface (one stat instead of two).

### SEC-07 — `listThemes` follows symlinks transparently (LOW)

`lib/theme-registry.js` lines 22–28: `readdirSync` lists entries; `statSync(dir).isDirectory()` follows symlinks. A symlink at `themes/evil` pointing to `/var/log` with a planted `theme.json` would register `evil` as a theme. The validator and the CSS_SAFE_VALUE regex still apply, so this is a discovery channel, not direct RCE — but it *is* a way to read attacker-controlled JSON from outside the repo.

Recommendation: Use `fs.lstatSync` and skip symlinks, or `fs.realpath` and assert the path is within `DEFAULT_THEMES_DIR`.

### SEC-08 — Prototype pollution defense is correct (POSITIVE)

`lib/theme-loader.js` lines 80, 118–125, 134, 146 explicitly reject `__proto__`, `constructor`, `prototype` in object keys *before* recursion. `additionalProperties: false` would catch them at most levels, but the explicit `FORBIDDEN_KEYS` set covers the `patternProperties` open-key maps. **Keep this.** No finding.

### SEC-09 — Error messages embed token values, including potentially sensitive ones (LOW)

`previewValue` (line 85–94) JSON-stringifies the bad value and truncates to 80 chars. If a `theme.json` contains a token whose value is somehow secret (it shouldn't, but consumers may misuse the system), the value will appear in test output / CI logs. The 80-char truncation limits exposure but does not prevent it.

Recommendation: Document that `theme.json` is a public artifact and must not contain secrets.

### SEC-10 — `compareKeys` regex `/\d+|\D+/g` is linear; no ReDoS (POSITIVE)

`lib/token-to-css.js` line 60. Alternation of two character classes — no nesting, no quantifier-on-quantifier. Linear time. No finding.

### SEC-11 — Dependency surface is `node:fs`, `node:path`, `node:url` only (POSITIVE)

All three reviewed lib files import from Node built-ins exclusively. Zero npm-supply-chain risk. **Keep this constraint** — it's a meaningful security property worth documenting in CONTRIBUTING.md if not already.

### SEC-12 — `import.meta.url === \`file://${process.argv[1]}\`` brittle on Windows (INFO)

`lib/theme-registry.js` line 61, `lib/token-to-css.js` line 122. On Windows, `process.argv[1]` is a backslash-separated path while `import.meta.url` is a forward-slash URL. The comparison would fail to detect "run as CLI" on Windows. Not a security issue, but the CLI silently no-ops, which can mask mistakes.

Recommendation: Use `fileURLToPath(import.meta.url) === resolve(process.argv[1])` for cross-platform CLI detection.

### SEC-13 — `theme.dir` returned by `getTheme` is an absolute filesystem path (LOW)

`lib/theme-registry.js` line 58: `return { ...theme, dir }`. Consumers receive a fully-qualified directory path. If a future consumer JSON-stringifies the returned theme into a public artifact (e.g., a generated docs page or an error endpoint), it leaks the deployer's filesystem layout.

Recommendation: Make `dir` non-enumerable, or document explicitly that callers must not serialize the returned object.

### SEC-14 — No integrity check on cached schema (INFO)

`getSchema` (line 28–32) caches the schema for the process lifetime. If a tool reloads the schema mid-process (none currently do, but the cache is module-private and never invalidated), a swapped file would not be picked up. Today this is fine; flagging for awareness as the codebase grows.

---

## Cross-cutting

### XC-01 — `skills/vdx-design/SKILL.md` does not require a11y self-check (MEDIUM)

The "Self-check before delivering" section (lines 42–45) lists imports, literal colors, and mobile-friendliness — but not a11y. Given the example pages have multiple AA violations (above), the skill is shipping an a11y-debt source. Add explicit checks:

- "Heading hierarchy flows h1 → h2 → h3 with no skipped levels."
- "Every `<input>` has a `<label for>` and lives inside a `<form>`."
- "Interactive elements that are not links are `<button>` or have `role` + `tabindex` + keyboard handler."
- "All non-decorative `<img>` have `alt`; decorative use `alt=""`."
- "Mixed-language strings carry `lang` attributes when within `lang='ko'` content."
- "First focusable element of `<body>` is a skip link to `<main>`."

### XC-02 — Examples are also templates (HIGH severity multiplier)

SKILL.md line 33: "Skim themes/<id>/examples/*.html for proven compositions." This is a *learning* path — every defect in an example becomes a defect in a generated page. **A11Y-03, A11Y-04, A11Y-06, A11Y-09 in particular propagate**.

Recommendation: Treat the examples directory as a normative reference. Run an a11y linter (axe-core, pa11y) against it in CI, fail on AA violations.

---

## Summary table

| ID       | Severity | Area     | Title                                                                |
|----------|----------|----------|----------------------------------------------------------------------|
| A11Y-01  | HIGH     | a11y     | Heading hierarchy: price as h2 in product-detail                     |
| A11Y-02  | HIGH     | a11y     | h1 → h4 skip in footer columns                                       |
| A11Y-03  | CRITICAL | a11y     | Color swatches not keyboard-operable                                  |
| A11Y-04  | HIGH     | a11y     | Storage selector uses `<a href="#">` not `<button>`                  |
| A11Y-05  | MEDIUM   | a11y     | "→" arrow announced literally by SR                                  |
| A11Y-06  | HIGH     | a11y     | Newsletter form is broken (no form, no submit button)                |
| A11Y-07  | MEDIUM   | a11y     | text-muted color borderline AA, fails at body-s size                 |
| A11Y-08  | MEDIUM   | a11y     | Inverse hero contrast unverified                                     |
| A11Y-09  | MEDIUM   | a11y     | `<article>` landmarks have no accessible name                        |
| A11Y-10  | LOW      | a11y     | Image alt text is just product name                                  |
| A11Y-11  | MEDIUM   | a11y     | English strings not marked with `lang="en"` inside `lang="ko"`        |
| A11Y-12  | LOW      | a11y     | Footer aria-label "푸터" duplicates landmark                          |
| A11Y-13  | LOW      | a11y     | Focus outline color contrast unverified on dark surface              |
| A11Y-14  | -        | a11y     | Reduced motion handled (positive)                                     |
| A11Y-15  | LOW      | a11y     | Placeholder doubling as helper text                                  |
| A11Y-16  | MEDIUM   | a11y     | No skip-to-main-content link                                         |
| A11Y-17  | LOW      | a11y     | `.label` visual styling unverified                                   |
| A11Y-18  | -        | a11y     | nav-brand aria-label good (positive)                                 |
| SEC-01   | MEDIUM   | security | `themesDir` parameter not validated for path traversal               |
| SEC-02   | HIGH     | security | `buildTokensCss` writes to arbitrary path from CLI argv              |
| SEC-03   | HIGH     | security | `CSS_SAFE_VALUE` allows `/*` `*/` comment-close injection            |
| SEC-04   | MEDIUM   | security | `JSON.parse` not size-bounded                                        |
| SEC-05   | MEDIUM   | security | Custom schema patterns can ReDoS                                     |
| SEC-06   | LOW      | security | TOCTOU between `existsSync` and `readFileSync`                       |
| SEC-07   | LOW      | security | `listThemes` follows symlinks transparently                          |
| SEC-08   | -        | security | Prototype pollution defense correct (positive)                       |
| SEC-09   | LOW      | security | Error messages embed token values verbatim                           |
| SEC-10   | -        | security | `compareKeys` regex linear (positive)                                |
| SEC-11   | -        | security | Built-ins-only dependency surface (positive)                         |
| SEC-12   | INFO     | security | CLI detection brittle on Windows                                     |
| SEC-13   | LOW      | security | `theme.dir` leaks filesystem path                                    |
| SEC-14   | INFO     | security | No integrity check on cached schema                                  |
| XC-01    | MEDIUM   | both     | SKILL.md self-check omits a11y                                       |
| XC-02    | -        | both     | Examples are templates (severity multiplier)                          |

---

VERDICT: **Do not ship without addressing the CRITICAL/HIGH findings.** A11Y-03 (non-keyboard-operable swatches) is the single biggest defect; it makes a core product-detail interaction inaccessible. SEC-02 and SEC-03 are real security regressions in the CSS pipeline that need fixing before any consumer is allowed to invoke `buildTokensCss` with untrusted input. The positive findings (prototype pollution defense, reduced-motion handling, built-ins-only deps, linear regex) are real and worth preserving as the codebase grows.

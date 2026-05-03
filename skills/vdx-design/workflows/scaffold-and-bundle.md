---
name: scaffold-and-bundle
description: Scaffold a vdx-design site project and bundle it into a single self-contained view/index.html. The canonical workflow document — Cursor and Cline forwarders should point here.
---

# Scaffold & Bundle a vdx-design Site

The user authors a site under `src/`, then ships a single self-contained
`view/index.html` with all CSS, JS, images, and fonts inlined. This document
is the source of truth — Claude Code, Cursor, and Cline all read it.

## When to invoke

**Scaffold** — when the user asks for any of:

- "Scaffold a vdx site at `<dir>`" / "Make a new samsung-kr project at `<dir>`"
- "Set up a site using the `<theme-id>` theme"
- A bare `/scaffold-vdx` / `/vdx-new` command if surfaced as a slash command

**Bundle** — when the user asks for:

- "Bundle the site at `<dir>`" / "`<dir>` 다 만들었어, 하나로 묶어"
- "Ship `<dir>`" / "Make the single-file deliverable"
- A bare `/bundle-vdx` / `/vdx-ship` command

If the request doesn't name a directory and there's an obvious recent target
(only one site folder has been touched this session), use that one and
confirm in your response.

## Output structure

After scaffold:

```
<target>/
  src/
    index.html       <link>s tokens.css, components.css, style.css; <script src=script.js>
    tokens.css       copied verbatim from themes/<theme-id>/tokens.css
    components.css   copied verbatim from themes/<theme-id>/components.css
    style.css        starter — page-local CSS goes here
    script.js        starter — page-local JS goes here
  view/              empty until bundle runs
```

After bundle:

```
<target>/
  src/               unchanged (the authoring form is preserved)
  view/
    index.html       single self-contained file: all four CSSs and the JS
                     are now inline; local <img> and CSS url() references
                     are data URIs; external https:// refs are untouched
```

## Scaffold steps

When the user requests a scaffold, do this in order. Use the `Bash` and
`Write` tools — there is no scaffold CLI on purpose.

1. **Pick the theme.** If the user named one, use it. Else default to
   `samsung-kr` and confirm in your reply. Verify the theme exists:
   `ls themes/<id>/theme.json`.

2. **Refuse to overwrite.** If `<target>/src/` already exists, do NOT
   silently overwrite. Ask the user whether to abort, pick a new target,
   or merge.

3. **Create the directories.** `mkdir -p <target>/src <target>/view`.

4. **Copy the theme CSS into src/.** This makes the project self-contained
   — the user can move it anywhere on disk and the relative `<link>`
   references still resolve.
   ```
   cp themes/<id>/tokens.css <target>/src/tokens.css
   cp themes/<id>/components.css <target>/src/components.css
   ```

5. **Write the four src/ files from templates.** The templates live at
   `skills/vdx-design/workflows/templates/`. Use `Read` to load each, then
   `Write` to the target with the substitutions below applied.
   - `templates/index.html` → `<target>/src/index.html`
     - Replace `{{TITLE}}` with a sensible page title (ask the user if not
       obvious from the request, e.g. "Galaxy S26 마케팅 페이지").
     - Replace `{{TARGET_REL}}` with the path the user will pass to
       `bundle.js` (typically the same `<target>` they gave you).
   - `templates/style.css` → `<target>/src/style.css` (no substitutions).
   - `templates/script.js` → `<target>/src/script.js` (no substitutions).

6. **Confirm.** Report the file tree you just created and remind the user
   that bundling is `node lib/bundle.js <target>` from the vdx-design repo
   root (or `npx vdx-bundle <target>` if/when the bin is wired up).

## Bundle steps

When the user requests a bundle:

1. **Verify input exists.** `ls <target>/src/index.html` — if missing,
   tell the user to scaffold first.

2. **Run the bundler.** `node lib/bundle.js <target>` from the repo root.
   Report the path of the output (`<target>/view/index.html`) and its
   byte size.

3. **Sanity check.** Open the file and confirm:
   - It contains `<style>` blocks (the inlined CSS) — not `<link>`.
   - It contains `<script>` blocks — not `<script src=>`.
   - External `https://` references (e.g. placehold.co images) are still
     present — those are intentionally not inlined.

   If any local `<link>` / `<script src>` survived in the output, that
   means the bundler couldn't read the file (typo in path, etc.). Tell
   the user which one and where it points.

## Authoring conventions inside src/

These are the rules to communicate to the user (and to follow yourself
when editing src/ on their behalf):

- **Token usage.** All CSS values come from `var(--vdx-…)`. Never hardcode
  hex/px. The full token list is in `src/tokens.css`.
- **Component classes.** Reuse classes from `src/components.css` first
  (`.btn-primary`, `.card`, `.product-card`, …). Page-local CSS goes in
  `src/style.css`.
- **One JS file.** Bundle inlines `script.js` verbatim with no module
  resolution — keep it self-contained or use `type="module"` only if the
  user opts into a browser-native module setup. No `import` from npm.
- **Local assets only for inlining.** Images you want shipped in the
  single-file deliverable must live next to `src/index.html` and be
  referenced as `./foo.png` or similar relative paths. External
  `https://` images stay external.
- **Page-local fonts.** If the user wants a custom font shipped in the
  bundle, add `@font-face` to `style.css` with `url('./fonts/foo.woff2')`
  pointing to a local file. Bundle will base64-inline it.

## Bundling rules (what bundle.js actually does)

For maintenance — this is the contract `lib/bundle.js` honours. If it
ever changes, update this section:

1. `<link rel="stylesheet" href="./local.css">` → `<style>…</style>` with
   the file's contents inlined. CSS `url(...)` references inside that
   stylesheet are resolved relative to the CSS file's directory and
   converted to data URIs (base64 for binaries, URL-encoded for SVG).
2. `<link rel="icon" href="./local.ico">` → same `<link>` but `href`
   becomes a data URI.
3. `<script src="./local.js"></script>` → `<script>…</script>` with the
   file inlined. `type="module"` is preserved if present.
4. `<img src="./local.png">` → `<img src="data:…">`.
5. Anything starting with `data:`, `//`, `http:`, `https:`, or `#` is
   left untouched.
6. If a referenced file is missing, the original tag is left as-is — the
   bundle will be broken in the same way the source was.

## Decision flow

If the scaffold or bundle is part of a larger design conversation and the
user has a meaningful taste choice (theme, hero layout, brand emphasis),
use the `vdx-decide` flow described in `skills/vdx-design/SKILL.md` rather
than picking silently.

# Adding a New Theme

The skill discovers themes from `themes/`. Adding a theme means dropping a directory; no skill code changes.

## Steps

### 1. Copy the reference theme

```bash
cp -R themes/samsung-kr themes/<your-id>
```

`<your-id>` must be lowercase, kebab-case, `^[a-z0-9][a-z0-9-]*$`. Examples: `samsung-global`, `harman-luxury`, `bespoke-home`.

### 2. Update `theme.json`

Edit at minimum:

- `id` — must match the directory name.
- `name` — human label, e.g. "Samsung Global".
- `version` — start at `1.0.0`.
- `description` — one sentence on what the theme is for.

Then walk every token group and supply your values. Every leaf required by `themes/theme-schema.json` MUST be present, even if you copy from samsung-kr unchanged. Missing tokens fail the schema check.

### 3. Regenerate `tokens.css`

```bash
node lib/token-to-css.js themes/<your-id>   # rebuild only your new theme
node lib/token-to-css.js                    # rebuild every registered theme
npm run build:tokens                        # same as above
```

This emits `tokens.css` with every CSS variable sorted by a numeric-aware comparator (so `spacing-2` precedes `spacing-10`). The output is byte-deterministic across Node versions and operating systems — pure JS, no ICU dependence. Don't hand-edit it; re-run the script after any `theme.json` change.

### 4. Tweak `components.css` (optional)

`components.css` references variables only, so it usually works as-is for any theme. Override per-theme only when component shapes differ (e.g. a theme that wants square buttons might override `.btn` to drop the pill radius).

### 5. Replace `examples/`

Swap `examples/landing.html`, `examples/product-detail.html`, `examples/nav-footer.html` with theme-appropriate copy and imagery. Keep them as stand-alone files that import `../tokens.css` and `../components.css`.

### 6. Update `themes/REGISTRY.md`

Add a row:

```
| `<your-id>` | Display Name | 1.0.0 | https://source.example.com | active |
```

### 7. Run tests

```bash
npm test
```

The schema check, registry test, and examples-render test pick the new theme up automatically. If anything fails, the error names the missing token or the broken example.

## What NOT to do

- **Don't** modify `themes/theme-schema.json` for a single theme. The schema is shared. If you need a new token, propose it as a system-wide change.
- **Don't** add per-theme `<style>` blocks inside example HTML. Anything reusable belongs in `components.css`; one-offs are fine but rare.
- **Don't** rename the standard CSS files. The tests assume `theme.json`, `tokens.css`, `components.css`.
- **Don't** ship a theme without at least one example. The example doubles as a smoke test and a designer reference.

## Suggested theme inspirations (future work)

- `samsung-global` — the international samsung.com (lighter chrome, more whitespace).
- `samsung-bespoke` — pastel palette, rounded geometry, lifestyle photography.
- `harman-luxury` — Harman/AKG/JBL Pro: deep blacks, copper/gold accents, condensed display type.
- `vd-internal` — internal employee tools: muted, dense, function-first.

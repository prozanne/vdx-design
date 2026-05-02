# Theme Registry

Authoritative list of themes shipped with `vdx-design`. Each row points to a directory under `themes/`. The directory name MUST equal the theme `id`.

| ID           | Name           | Version | Inspiration                | Status |
| ------------ | -------------- | ------- | -------------------------- | ------ |
| `samsung-kr` | Samsung Korea  | 1.0.0   | https://www.samsung.com/sec/ | active |

## Adding a theme

The README is the source of truth for the workflow — see [README.md § Adding a new theme](../README.md#adding-a-new-theme). Short version:

1. `cp -r themes/samsung-kr themes/<id>` (gets you a working theme to mutate).
2. Edit `themes/<id>/theme.json` — at minimum change `id`, `name`, `defaultLang`, and the brand tokens.
3. `npm run build:tokens -- themes/<id>` to regenerate `tokens.css` from your edits (or `npm run build:tokens` to rebuild every theme).
4. Replace any examples in `themes/<id>/examples/` with theme-appropriate references (keep at least one file).
5. Append a row to the table above.
6. `npm test` — the schema check, registry test, and example linter will pick the new theme up automatically.

See `skills/vdx-design/references/theme-extension.md` for the full guide.

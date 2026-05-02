# vdx-design

A themed frontend-design skill for Samsung internal use. Give it a registered theme id and it generates HTML/CSS that matches that theme's look and feel.

The first registered theme is `samsung-kr`, modeled after [samsung.com/sec](https://www.samsung.com/sec/). New themes can be added by dropping a directory under `themes/` — no code changes to the skill itself.

## Quick start

```bash
# Validate themes & run all tests
npm test

# List registered themes
npm run list:themes

# Regenerate tokens.css for every registered theme after editing theme.json.
# With no argument the script walks every directory under themes/ and
# rewrites each theme's tokens.css, so a brand-new theme gets picked up
# without any change to package.json.
npm run build:tokens

# Or for a single theme — note the `--` to forward the path argument
# through `npm run` to the underlying node invocation:
npm run build:tokens -- themes/samsung-kr
# Equivalent direct invocation:
node lib/token-to-css.js themes/samsung-kr
```

## Layout

```
vdx-design/
├── skills/vdx-design/        # Skill instructions (theme-agnostic)
│   ├── SKILL.md
│   └── references/           # Design system, components, layout, typography, theme extension
├── themes/                   # Themes
│   ├── theme-schema.json     # Schema every theme must satisfy
│   ├── REGISTRY.md           # List of registered themes
│   └── samsung-kr/
│       ├── theme.json        # Tokens (source of truth)
│       ├── tokens.css        # Generated CSS variables
│       ├── components.css    # Pre-styled component classes
│       ├── README.md
│       └── examples/         # Reference HTML pages
├── lib/                      # Theme tooling
│   ├── theme-loader.js
│   ├── token-to-css.js
│   └── theme-registry.js
├── tests/                    # node --test suites
└── docs/superpowers/specs/   # Design specs
```

## Adding a new theme

See `skills/vdx-design/references/theme-extension.md`. Short version:

1. `cp -r themes/samsung-kr themes/<your-id>`.
2. Edit `themes/<your-id>/theme.json` (id, name, defaultLang, tokens).
3. `npm run build:tokens -- themes/<your-id>` regenerates `tokens.css` (or `npm run build:tokens` to rebuild every theme; the no-arg form auto-discovers new themes).
4. Replace `examples/*.html` with theme-appropriate references (keep at least one file so the example tests run).
5. Add a row to `themes/REGISTRY.md`.
6. `npm test` to validate.

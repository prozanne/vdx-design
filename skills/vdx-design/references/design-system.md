# Design System

Each theme is a JSON file (`theme.json`) plus matching CSS (`tokens.css`, `components.css`). The JSON is the source of truth — `tokens.css` is generated from it.

## Token tree

```
colors
  brand            primary, primaryHover, secondary, accent
  neutral          0, 50, 100, 200, 300, 500, 700, 900, 1000   (light → dark)
  semantic         success, warning, danger, info
  surface          page, card, elevated, inverse
  text             primary, secondary, muted, onBrand, onInverse, onInverseSecondary
  border           subtle, default, strong, inverse
  swatch           (optional) per-theme product variant colors (e.g. mint, black, blue, pink)

typography
  fontFamily       sans, display, mono
  fontSize         caption, bodyS, bodyM, bodyL, h4, h3, h2, h1, displayM, displayL, displayXL
  lineHeight       tight, normal, relaxed
  fontWeight       regular, medium, semibold, bold
  letterSpacing    tight, normal, wide

spacing            0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24   (multiples of 4px)
radius             none, sm, md, lg, pill
shadow             none, sm, md, lg
motion.duration    fast, base, slow
motion.easing      standard, emphasized
breakpoints        mobile, tablet, laptop, desktop, xl

layout             (optional) page-level max-widths that don't fit spacing/breakpoints
                   typical keys: narrow, content, wide

components
  button           height, paddingX, radius, fontWeight
  input            height, paddingX, radius, borderColor
  card             padding, radius, shadow
  nav              height, background, color
  footer           background, color
```

### Notes

- **`text.onInverseSecondary`** is a softened version of `text.onInverse` for low-priority copy (footnotes, metadata) on dark surfaces. Use `onInverse` for body and headings; `onInverseSecondary` for the muted equivalent. Without this token, dark sections force a binary white-or-bright-gray choice with poor visual hierarchy.
- **`colors.swatch`** is a free-form bag scoped to product-variant colors (e.g. phone paint colors). Tokens here are SKU data, NOT design tokens — they don't have a "role" and only the product UI references them. Adding a swatch never requires schema changes (the keys are pattern-matched).
- **`layout.*`** is optional. Use it for max-widths the spacing scale can't express cleanly (e.g. `narrow: 720px` for a centered reading column). Reference via `var(--vdx-layout-narrow)` etc.

## CSS variable naming

Tokens are flattened into CSS custom properties under the `--vdx-` namespace, kebab-cased:

- `colors.brand.primary`         → `--vdx-colors-brand-primary`
- `colors.brand.primaryHover`    → `--vdx-colors-brand-primary-hover`
- `colors.neutral.500`           → `--vdx-colors-neutral-500`
- `typography.fontSize.bodyM`    → `--vdx-typography-font-size-body-m`
- `typography.fontSize.h1`       → `--vdx-typography-font-size-h1`        (number stays attached)
- `typography.fontSize.displayXL`→ `--vdx-typography-font-size-display-xl`
- `spacing.6`                    → `--vdx-spacing-6`
- `radius.pill`                  → `--vdx-radius-pill`
- `components.button.paddingX`   → `--vdx-components-button-padding-x`

If you're unsure of a variable name, open `themes/<id>/tokens.css` — it lists every variable in alphabetical order.

## Token usage rules

1. **Reference, never inline.** `color: var(--vdx-colors-text-primary)` not `color: #1A1A1A`.
2. **Choose the role-correct token.** Body copy is `text.primary`, not `neutral.900`. Borders are `border.default`, not `neutral.300`. Roles describe intent and survive theme changes; raw scales don't.
3. **Stay on the spacing grid.** Pick from the spacing scale rather than inventing `21px`.
4. **Display vs heading.** Use `display*` sizes only inside `.hero` and full-bleed sections. Use `h1`–`h4` for in-flow page structure.
5. **One brand colour per surface.** Don't combine `brand.secondary` (Samsung blue) with `semantic.danger` (red) on the same CTA — pick one and let it lead.

## Adding a token

If you genuinely need a new token (e.g., `colors.brand.tertiary`):

1. Add it to `themes/theme-schema.json` (required + property entry).
2. Add it to every theme's `theme.json` (or the schema check fails).
3. Run `npm run build:tokens` to regenerate `tokens.css` for each theme.
4. Document the role here.
5. Add a test in `tests/samsung-theme.test.js` if it should be present in the Samsung theme specifically.

This is intentionally a friction point. Most "I need a new token" requests are actually misuse of an existing role token.

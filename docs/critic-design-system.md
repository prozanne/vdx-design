---
date: 2026-05-03
reviewer: design-system-critic
theme: samsung-kr
version: 1.0.0
---

# Adversarial review of the `samsung-kr` theme

Scope: `themes/samsung-kr/{theme.json,tokens.css,components.css,README.md}` against
`themes/theme-schema.json`. Goal: surface the things that will bite when this
theme is used to render real product pages, not the things that look fine in a
demo.

---

## 1. Token coherence

### 1.1 Type scale is not a single ratio — MAJOR

The README claims the theme "carries the page" with display sizes 48 / 64 / 80,
and the steps in between read like a modular scale. They are not. Adjacent
ratios:

| from -> to | ratio |
| --- | --- |
| 12 -> 14 | 1.167 |
| 14 -> 16 | 1.143 |
| 16 -> 18 | 1.125 |
| 18 -> 20 | 1.111 |
| 20 -> 24 | 1.200 |
| 24 -> 32 | 1.333 |
| 32 -> 40 | 1.250 |
| 40 -> 48 | 1.200 |
| 48 -> 64 | 1.333 |
| 64 -> 80 | 1.250 |

Six different ratios across ten steps. There is no underlying system; the scale
is a hand-picked list of "nice round numbers." That is a defensible choice for a
brand site, but the README should not imply otherwise, and the gap between `h3`
(24) and `h2` (32) at 1.333 is jarring next to the gap from `h2` (32) to `h1`
(40) at 1.250 — large headings shrink in step size as they grow, which is the
opposite of how a typographic scale usually feels.

Recommend either:
- pick one ratio (1.250 is closest to the median, and Samsung's display work
  tends toward 1.25/1.333 anyway) and snap every value, or
- explicitly document this as a non-modular hand-tuned scale in `README.md`.

### 1.2 Spacing scale is honest 4px-grid — clean

All thirteen spacing values land on the 4px grid, and the key matches `value /
4` for every step (`spacing.6` = 24px, `spacing.10` = 40px). No surprises. The
scale skips 7, 9, 11, 13–15, 17–19, 21–23, which the README correctly justifies
as "skips intentionally to discourage in-between values." Good.

### 1.3 Color naming mixes role and appearance — MAJOR

Most tokens are role-named: `text.primary`, `surface.page`, `border.subtle`,
`brand.accent`. That is correct.

But `colors.swatch.{mint,black,blue,pink}` is appearance-named, and worse,
`swatch.black` resolves to `#1A1A1A` — which is the same value as
`neutral.900`, `text.primary`, and `border.strong`, but is *not* the same as
`neutral.1000` (`#000000`) or `brand.primary` (`#000000`). So the theme has a
token literally named `black` that is not actually black. A consumer who picks
`swatch.black` because they "want black" will get a near-black that does not
match the chrome.

Pick one of:
- rename `swatch.*` to role-ish names tied to where they are used (the
  examples use them for color-picker chips on a product page, so
  `productSwatch.{mint,blue,pink}` would be honest), or
- drop `swatch` from the schema entirely and let consumers define their own
  ad-hoc swatches per page. Right now the schema's `swatch` block is open-ended
  (`patternProperties`) but the theme uses it as a fixed four-value enum, which
  pretends the swatches are a global system token when they are really a
  per-page asset.

### 1.4 Brand vs neutral collision — MINOR

`brand.primary` = `#000000` and `neutral.1000` = `#000000`. Same hex, two
roles. Likewise `brand.primaryHover` = `#1A1A1A` = `neutral.900` =
`text.primary` = `border.strong` = `swatch.black`. Five tokens, one value.

This is not a bug — overlapping values is normal in a black-dominant theme —
but it means a refactor that nudges "brand black" away from pure black (e.g.
to a Samsung-blue-tinted off-black, which the brand sometimes uses) will silently
change `text.primary` and `border.strong` too. Document the dependency, or
introduce a single `colors.foundation.black` and have the role tokens reference
it through the build pipeline. (`tokens.css` already inlines hex values, so
references would have to live in `theme.json` and the build step would resolve
them — non-trivial, hence MINOR.)

### 1.5 Radius scale jumps from 8 to 16 to 999 — NIT

`radius`: `none/0`, `sm/4`, `md/8`, `lg/16`, `pill/999`. The 8 -> 16 jump is
fine, but there's no `xl` between 16 and pill, so any component that wants a
softly-rounded large hero card (24–32px) has to either pick `lg` (too tight) or
`pill` (too round). Most theme libraries include a 24 or 32 step. Add one when
a real component needs it; not a blocker.

---

## 2. State coverage

I read every `.btn*`, `.input`, `.card*`, `.product-card`, `.nav-links a`,
`.footer a` selector in `components.css` and crossed off each interactive state.

### 2.1 Buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-accent`, `.btn-link`) — MAJOR

| state | covered? |
| --- | --- |
| default | yes |
| hover | yes (gated behind `@media (hover: hover)`, correct) |
| focus-visible | yes (shared rule, 2px brand-accent ring) |
| active (`:active`) | NO |
| disabled (`:disabled`, `[aria-disabled="true"]`) | yes (opacity 0.5) |
| error / destructive | NO (no `.btn-danger`) |
| loading (`[aria-busy="true"]`, spinner) | NO |
| pressed / toggled (`[aria-pressed="true"]`) | NO |

`:active` is the most painful gap. On a pill-shaped CTA at 48px tall, the
absence of an active-press state means the button feels mushy on touch — there
is no momentary darken on tap. Trivial fix: a single `:active`
rule that nudges the background to `neutral.900` (already inlined as the hover
value, so introduce a darker `brand.primaryActive` token, e.g. `#333` for
primary, plus matching for secondary/ghost/accent).

`btn-link` has no hover, focus-visible aside, or visited state and lives at
`color: text.primary` with an underline — fine for accessibility, but its
underline-offset (4px) is not tokenized, and it has no destructive sibling.

No `.btn-danger` means a destructive action page (e.g. "delete this account")
has to be hand-rolled outside the system. That is a contract gap for a theme
that ships a `semantic.danger` token.

### 2.2 Inputs (`.input`) — BLOCKER

| state | covered? |
| --- | --- |
| default | yes |
| hover | NO |
| focus | yes (border becomes `brand.primary`) |
| focus-visible | yes (shared rule) |
| active | n/a |
| disabled | NO |
| error / invalid (`.input--error`, `:invalid`, `[aria-invalid="true"]`) | NO |
| placeholder color | NO (relies on UA default) |
| readonly | NO |

For a theme used to scaffold real Samsung-style product pages — which include
sign-in, region selection, address forms, and newsletter capture — shipping an
input with no error state, no disabled state, and no placeholder styling is a
ship-blocker. There is also no `.input-group`, `.helper-text`, or
`.error-text` companion class, so a consumer rendering "이메일 형식이
올바르지 않습니다" (an invalid-email helper) has to invent the styling. Mark
this BLOCKER because the schema's `theme.json` declares an
`components.input.borderColor` token but provides no path to render an
error-state border.

### 2.3 Cards (`.card`, `.product-card`, `.card-flat`) — MINOR

| state | covered? |
| --- | --- |
| default | yes |
| hover | yes (lift + shadow) |
| focus-visible | NO (cards are not focusable, but `.card a` would inherit nothing) |
| selected / aria-current | NO |
| loading skeleton | NO |
| disabled | NO |

When `.card` wraps a link or button, focus styling falls through to the inner
element — that's correct. But there is no `.card[aria-pressed="true"]` /
`.card.is-selected` style, which is a common pattern for "pick a Galaxy
configuration" cards on Samsung product pages. MINOR because workarounds exist.

### 2.4 Navigation links (`.nav-links a`) — MINOR

Hover underline via `::after` is cute but only fires under
`@media (hover: hover)`, so on touch devices the active page never gets an
underline. There is no `.nav-links a[aria-current="page"]` rule, which means
the current page is visually indistinguishable from the others on touch. Add an
`[aria-current]` style independent of hover.

### 2.5 Badges (`.badge*`) — NIT

Badges are display-only, so no states needed. But there is no `.badge-success`
even though `semantic.success` is tokenized. Inconsistent — either ship the
full semantic family (`badge-success`, `badge-warning`, `badge-info`,
`badge-promo`) or document that the danger badge is intentionally the only
semantic variant. The current state has `badge-info` mapped to
`brand.secondary` *not* `semantic.info`, which is confusing because the two
tokens happen to share the same hex (`#1428A0`) — so the badge would look right
for the wrong reason.

---

## 3. Contrast (WCAG 2.1 AA)

Computed against the hex values in `theme.json`. For each pair I report the
ratio and AA result for normal text (4.5:1) and for non-text UI / large text
(3:1).

| pair | ratio | AA-normal | AA-large / UI |
| --- | --- | --- | --- |
| `text.primary` (#1A1A1A) on `surface.page` (#FFFFFF) | 17.40 | PASS | PASS |
| `text.secondary` (#3F3F3F) on `surface.page` | 10.53 | PASS | PASS |
| `text.muted` (#767676) on `surface.page` | 4.54 | PASS (just barely) | PASS |
| `text.muted` (#767676) on `surface.elevated` (#FAFAFA) | **4.35** | **FAIL** | PASS |
| `text.onInverse` (#FFFFFF) on `surface.inverse` (#000000) | 21.00 | PASS | PASS |
| `text.onInverseSecondary` (#CCCCCC) on `surface.inverse` | 13.08 | PASS | PASS |
| `btn-primary` text on bg (#FFFFFF on #000000) | 21.00 | PASS | PASS |
| `btn-accent` text on bg (#FFFFFF on #1428A0) | 11.41 | PASS | PASS |
| focus ring `brand.accent` (#2189FF) on white | 3.45 | FAIL (text) | PASS (UI 3:1) |
| `badge-promo` (#FFFFFF on #E12832) | 4.61 | PASS | PASS |
| `badge-info` (#3F3F3F on #F5F5F5) | 9.66 | PASS | PASS |
| `caption` 12px (`text.muted` on white) | 4.54 | PASS | PASS |
| footer color (#DDDDDD on #1A1A1A) | 12.81 | PASS | PASS |
| footer-bottom `text.muted` on `#1A1A1A` | **3.83** | **FAIL** | PASS |
| `semantic.warning` (#F2A100) on white | 2.13 | FAIL | FAIL |
| `semantic.success` (#00A96E) on white | 3.04 | FAIL | PASS |

### 3.1 `text.muted` on `surface.elevated` fails AA — MAJOR

`#767676` on `#FAFAFA` = 4.35:1, which is below the 4.5:1 AA threshold for
normal text. Anywhere a caption or muted secondary line appears inside a
`.card-flat` (which uses `surface.elevated` as its background) it will be
non-compliant. Same problem on the homepage hero — the hero background is
`surface.elevated`, and a hero subtitle styled with `.text-muted` would fail.

`text.muted` on white is 4.54:1 — passes by 0.04. Any future tweak (anti-alias
rendering, monitor calibration, bumping the hue 1° toward green) will tip it
over. This is a design system on a knife's edge.

Fix: darken `text.muted` to at least `#737373` (4.74:1 on white, 4.55:1 on
elevated) or, better, `#6B6B6B` for headroom. It costs nothing visually.

### 3.2 `text.muted` on inverse footer-bottom fails AA — MAJOR

`.footer-bottom` sets `color: var(--vdx-colors-text-muted)` (#767676) on the
footer background `#1A1A1A`. Ratio = 3.83:1, which fails AA-normal. The footer
copy column (`color: --vdx-components-footer-color` = `#DDDDDD`) is fine; the
problem is the bottom strip with copyright and legal links. Fix: use
`text.onInverseSecondary` (#CCCCCC -> 13.08:1) instead of `text.muted`. The
component already references `--vdx-colors-text-on-inverse-secondary` for
secondary inverse copy elsewhere, so the precedent and token are there.

### 3.3 Focus ring on white passes UI but borderline — MINOR

`brand.accent` (#2189FF) ring on white = 3.45:1, just above the WCAG 2.1 SC
1.4.11 threshold of 3:1 for non-text UI. It's compliant, but a darker focus
color would be safer for outdoor sunlight viewing on phones. Either keep
`brand.accent` for fills only and add a dedicated `colors.focus.ring` token
(e.g. `#0070F3`, 4.50:1), or accept the current minimum.

### 3.4 `semantic.warning` on white fails for text — MAJOR

`#F2A100` on white = 2.13:1. If the theme is ever used to render a warning
text snippet (`<p class="text-warning">`), it will be unreadable. The theme
does not currently ship a `.text-warning` class, so this is latent — but it is
a token that a consumer will reach for, and the value is impossible to use as
text on a light surface. Either:
- darken `semantic.warning` to ~`#B36C00` (4.55:1 on white) and document that
  the bright orange is a reserved fill-only color, or
- add a paired `semantic.warningText` token at the darker value, modeled on
  Material Design's "on-surface" pairs.

`semantic.success` on white at 3.04:1 has the same shape — works for icons /
borders / fills, fails for body text. Document or add paired tokens.

### 3.5 `caption` at 12px on white — MINOR

`text.muted` is the default caption color (`.caption { color:
text.muted }`). 12px is below WCAG's 18.66px ("large text") threshold, so it
needs the full 4.5:1. The 4.54:1 result passes by 1%. See 3.1 — bump
`text.muted`.

---

## 4. Naming consistency

### 4.1 JSON vs CSS conversion is consistent — clean

`theme.json` uses camelCase (`primaryHover`, `paddingX`, `onInverse`,
`displayXL`). `tokens.css` produces kebab-case (`brand-primary-hover`,
`padding-x`, `on-inverse`, `display-xl`). The token-to-css generator handles
both single-word and multi-word keys, and acronyms (`XL`, `S`, `M`, `L`) are
correctly lower-cased. No collisions detected.

### 4.2 `colors.text.onInverseSecondary` is a contract violation — MAJOR

`themes/theme-schema.json` line 59 lists `text.required` as `["primary",
"secondary", "muted", "onBrand", "onInverse"]`. `onInverseSecondary` is in
`text.properties` but not in `required`, and the schema does not declare any
naming convention. The `samsung-kr/theme.json` includes `onInverseSecondary`
and `components.css` depends on it (the inverse-surface paragraph rule).

The MAJOR concern: another theme that conforms to the schema can omit
`onInverseSecondary`, and `samsung-kr`'s components.css will produce broken
inverse-surface body copy *if it is reused in another theme's component
shell*. That is unlikely in this architecture (each theme has its own
`components.css`), but the schema should either:
- promote `onInverseSecondary` to required (forces every theme to provide it), or
- have `components.css` fall back to `var(--vdx-colors-text-on-inverse, --vdx-colors-text-muted)` so a missing token degrades gracefully.

Right now the contract is: components.css *must* be loaded with a theme that
provides this token. That is implicit, not enforced.

### 4.3 `radius.pill` and `components.button.radius` duplicate `999px` — NIT

`radius.pill` = `999px`. `components.button.radius` = `999px`. The button
component should reference `radius.pill` semantically (so a future theme that
defines pill = `9999px` automatically updates button), not redefine the value.
This shows up in `tokens.css` as two independent variables
(`--vdx-radius-pill` and `--vdx-components-button-radius`) that happen to share
a value. If a future theme bumps `radius.pill` to `9999px` while leaving
`components.button.radius` at `999px`, the button stops being pill-shaped. The
current architecture inlines values rather than aliasing — fine for the
generator, but the schema permits the drift.

### 4.4 `swatch` plural/singular inconsistency — NIT

Every other color group is singular: `brand`, `neutral`, `semantic`, `surface`,
`text`, `border`. `swatch` is also singular and is a *collection of swatches*,
which is a tiny mismatch but defensible. More notable: `breakpoints` is plural
and `motion` is singular, while `motion.duration` and `motion.easing` are
sub-singular. Not worth changing, but inconsistent.

### 4.5 `typography.fontSize` keys mix size words and t-shirt sizes — MINOR

Keys: `caption`, `bodyS`, `bodyM`, `bodyL`, `h4`, `h3`, `h2`, `h1`, `displayM`,
`displayL`, `displayXL`. Three families:
1. Semantic role: `caption`, `body*`
2. HTML element: `h1`–`h4`
3. Display tier: `display*`

Mixing roles, HTML tags, and tiers in the same dictionary forces consumers to
remember which is which. `h1`-named tokens also imply that `<h2>` should *not*
use `h1` size, which is true for prose but wrong for marketing pages where a
section heading is set in the display scale.

A cleaner shape would be:
```
fontSize: {
  caption: 12, bodyS: 14, bodyM: 16, bodyL: 18,
  headingS: 20, headingM: 24, headingL: 32, headingXL: 40,
  displayS: 48, displayM: 64, displayL: 80
}
```

11 sizes either way; the second renames `h1`-`h4` to `heading*` so
HTML-element coupling disappears. Not a blocker — call it MINOR — but the
current `h1`-as-token name is going to confuse engineers who type `class="h1"`
on an `<h2>` and feel weird about it.

---

## 5. Dead tokens

I diff'd the variables emitted by `tokens.css` against everything referenced
by `components.css` and the four `examples/*.html` files. The list below is
"present in `tokens.css`, never read":

### 5.1 Unused tokens (BLOCKER, several)

| token | output as | used? |
| --- | --- | --- |
| `colors.brand.accent` | `--vdx-colors-brand-accent` | yes (focus ring only — but `examples/*.html` never references it) |
| `colors.neutral.0` | `--vdx-colors-neutral-0` | NO |
| `colors.neutral.200` | `--vdx-colors-neutral-200` | NO (mapped only via `border.subtle`/`neutral-200`-collision) |
| `colors.neutral.300` | `--vdx-colors-neutral-300` | NO |
| `colors.neutral.500` | `--vdx-colors-neutral-500` | NO (mapped via `text.muted`) |
| `colors.neutral.700` | `--vdx-colors-neutral-700` | NO |
| `colors.neutral.900` | `--vdx-colors-neutral-900` | examples reference it once for a hero gradient bg |
| `colors.neutral.1000` | `--vdx-colors-neutral-1000` | NO |
| `colors.semantic.info` | `--vdx-colors-semantic-info` | NO (collides with brand.secondary value, never used directly) |
| `colors.semantic.success` | `--vdx-colors-semantic-success` | NO |
| `colors.semantic.warning` | `--vdx-colors-semantic-warning` | NO |
| `colors.border.strong` | `--vdx-colors-border-strong` | NO |
| `typography.fontFamily.mono` | `--vdx-typography-font-family-mono` | NO |
| `typography.lineHeight.relaxed` | `--vdx-typography-line-height-relaxed` | NO |
| `typography.fontWeight.regular` | `--vdx-typography-font-weight-regular` | NO |
| `typography.fontWeight.medium` | `--vdx-typography-font-weight-medium` | NO (font-weight: 500 is hardcoded in `.label` and `.nav-links a`) |
| `typography.fontWeight.bold` | `--vdx-typography-font-weight-bold` | NO (hardcoded `font-weight: 700` in headings/`.nav-brand`) |
| `typography.letterSpacing.normal` | `--vdx-typography-letter-spacing-normal` | NO |
| `radius.none` | `--vdx-radius-none` | NO |
| `radius.sm` | `--vdx-radius-sm` | NO (`.input` uses `components.input.radius` = 4 directly) |
| `radius.md` | `--vdx-radius-md` | NO (used once in examples `.color-chip` rule) |
| `radius.lg` | `--vdx-radius-lg` | NO |
| `shadow.none` | `--vdx-shadow-none` | NO |
| `shadow.lg` | `--vdx-shadow-lg` | NO |
| `motion.duration.slow` | `--vdx-motion-duration-slow` | NO |
| `motion.easing.emphasized` | `--vdx-motion-easing-emphasized` | NO |
| `breakpoints.mobile` (360) | `--vdx-breakpoints-mobile` | NO (media queries hardcode 767/1024) |
| `breakpoints.tablet` | `--vdx-breakpoints-tablet` | NO |
| `breakpoints.laptop` | `--vdx-breakpoints-laptop` | used once for `.container-wide` max-width — but only in `components.css`, never as a media-query reference |
| `breakpoints.desktop` | `--vdx-breakpoints-desktop` | yes (container-wide max) |
| `breakpoints.xl` | `--vdx-breakpoints-xl` | NO |
| `layout.content` | `--vdx-layout-content` | NO (the `.container` class hardcodes `1280px` even though this token is exactly that — see 5.3) |
| `layout.wide` | `--vdx-layout-wide` | NO |
| `colors.swatch.mint` | | only examples |
| `colors.swatch.blue` | | only examples |
| `colors.swatch.pink` | | only examples |
| `colors.swatch.black` | | only examples |
| `zIndex.base` | `--vdx-z-index-base` | NO |
| `zIndex.dropdown` | `--vdx-z-index-dropdown` | NO |
| `zIndex.modal` | `--vdx-z-index-modal` | NO |
| `zIndex.toast` | `--vdx-z-index-toast` | NO |

That is roughly 35 dead tokens — over a quarter of what `tokens.css` ships.
This is BLOCKER-tier because every dead token bloats the cascade for nothing
and signals "we wrote a token system without designing what it would be used
for." The schema requires most of them (e.g. `zIndex` is listed because real
themes need stack-order tokens), so the fix is not to remove them — it is to
*use* them or document that they exist as scaffolding for future components.

### 5.2 Hardcoded values that should reference tokens — MAJOR

`components.css` directly inlines values that have matching tokens:

- `.container { max-width: 1280px; }` — should be
  `var(--vdx-layout-content)`. The token exists and equals 1280px exactly.
- `@media (max-width: 1024px)` and `@media (max-width: 768px)` and `@media
  (max-width: 767px)` — should reference `--vdx-breakpoints-laptop`/`-tablet`.
  CSS native media queries cannot read CSS variables, so this is a known
  limitation, but the breakpoints in `theme.json` are 360/768/1024/1440/1920
  while the CSS uses 767 (off by one) and 1024. The off-by-one is correct for
  `max-width` queries (you want `< 768px` = `<= 767px`), but the value should
  be derived in a build step, not scattered around components.css. Each of
  these calls should at minimum carry a comment that links to the token name.
- `.btn-sm { height: 36px; }` — there is no spacing/size token at 36, but a
  build/schema review should decide if `components.button.heightSm` should be a
  token.
- `.btn-lg { height: 56px; }` — same.
- `.badge { height: 24px; }` — could reference `spacing.6`, but mixing height
  and spacing tokens is sloppy. A `components.badge.height` token would be
  better.
- `.btn-link { text-underline-offset: 4px; }` — could reference
  `spacing.1`. NIT.
- `.hero { min-height: 600px; }` — magic number. NIT.
- `.hero p { max-width: 560px; }` — magic measure (~70ch). MINOR; should be
  documented as "hero subtitle measure" if intentional.

### 5.3 `colors.brand.accent` is used only as the focus ring — MINOR

The README says brand-accent (`#2189FF`) is for "active/hover states only."
But `components.css` only uses `--vdx-colors-brand-accent` for the
`focus-visible` ring and as the destination of `.btn-accent:hover`. There is
no `:active` state anywhere (see 2.1), so the README is selling a use of the
accent color that the system doesn't deliver.

---

## 6. Brand fit — does it feel like Samsung?

### 6.1 Premium minimal — partial credit

The black-on-white chrome, pill CTAs, and 80px display sizes do read premium.
Card hover with `translateY(-2px)` is the correct restrained motion. Good.

But Samsung's actual product pages — especially Galaxy S and Bespoke
appliances — lean heavily on:
- **Full-bleed image hero with edge-to-edge product photography**, where the
  hero text is *overlaid* on the image. The current `.hero` class is a flat
  background-color block (`surface.elevated`), with `padding-block: 80px`,
  which feels like a content marketing page, not a product launch.
- **Generous letter-spacing and ALL-CAPS eyebrows on display headings**
  (`SAMSUNG GALAXY S26 ULTRA` style). The theme has `hero-eyebrow` doing the
  uppercase + wide-tracked thing, which is correct, but uses
  `letter-spacing.wide = 0.04em`, which is half what Samsung typically uses
  for display eyebrows (~0.08–0.1em).
- **Color-driven product chips/swatches** with the actual product colors. The
  theme ships generic mint/blue/pink swatch tokens that aren't even used in
  components.css — they exist only for examples to reference, and the four
  values look like a stock palette, not a Samsung Galaxy palette.

MAJOR for the hero — the most important component for a Samsung-style brand
page is rendered as a flat colored block.

### 6.2 Generous whitespace — yes

`section { padding-block: 80px }` matches Samsung's typical 80–120px section
breaks. Container max-width 1280px / 1440px is correct for SEC's site (which
caps narrower than US samsung.com at ~1440). The hero `min-height: 600px`
likewise. This dimension is genuinely Samsung-shaped.

### 6.3 Restrained color — yes, but at the cost of identity — MINOR

The README says "Black does the heavy lifting; Samsung blue is reserved for
accent." That is *accurate*, but the result is that 80% of any rendered page
is monochrome. Samsung's current Korea site (May 2026 capture, per README) is
not as monochrome as this theme implies — there are large hero photos with
saturated product backgrounds (Galaxy S26's titanium gradient, Bespoke's
pastel facets). The theme has no infrastructure for "image-led hero with
gradient overlay" — no `.hero--image`, no overlay gradient token, no
`text-on-image` color token. So renderings will feel more like a corporate
page than a product page.

This is a design *choice* (the README owns it), but it is a partial match for
"feels like Samsung" — closer to "feels like a generic premium retailer with
black CTAs."

### 6.4 Typographic hierarchy — strong

`SamsungSharpSans` -> `SamsungOne` -> Korean fallbacks (`Pretendard`, `Apple SD
Gothic Neo`, `Noto Sans KR`) -> Latin fallbacks. The fallback chain is
correct: Pretendard is the de-facto modern Korean fallback for Samsung-aligned
type. Display family separated from sans family is the right structural call.

`letter-spacing: -0.02em` on display + headings is a hair tighter than
Samsung's actual display tracking (usually around -0.01em to -0.015em on the
real site), but inside the right neighborhood.

### 6.5 Missing patterns Samsung pages assume

The theme doesn't ship any of these, which a real samsung.com/sec landing
needs:
- **Sticky compact header on scroll** (the nav shrinks). MAJOR.
- **Comparison table** for product specs. MINOR.
- **Multi-column footer with country selector** (Samsung's footer has a region
  picker; this theme's footer is a flat link list). MINOR.
- **Floating "buy now" / "add to cart" CTA** on product detail pages. MINOR.
- **Loading / skeleton states** for image grids. MAJOR (interacts with 2.3).
- **Tabs** for product configurations. MAJOR.
- **Accordions** for FAQ-style spec sections. MAJOR.

The `components.css` file ships button, card, input, nav, footer, hero, badge,
product-card. That is roughly 60% of what a Samsung-shaped product page needs.
The rest is left to consumers to invent — which means each consumer reinvents
inconsistently and the theme stops being a system.

---

## VERDICT

The theme has a well-thought-out spacing grid, solid typographic fallbacks, and
honest token paths from `theme.json` -> `tokens.css`. But it ships with: an
input that has no error or disabled state (BLOCKER), a contrast failure on
`text.muted` over `surface.elevated` and on `text.muted` in the inverse footer
(MAJOR x2), a `swatch.black` that is not black (MAJOR), roughly 35 dead tokens
that bloat the CSS without earning their cost (BLOCKER in aggregate), no `:active`
state on any button (MAJOR), and a hero implementation that misses the
image-led hero pattern Samsung's brand depends on (MAJOR). The type scale is a
hand-tuned mix of six different ratios, defensible but mis-described as a
modular scale (MAJOR). Brand fit lands on "premium retailer in black-and-white
mode" rather than "Samsung product page."

**Status: NOT SHIPPABLE without remediation.** Fix the input states, the two
contrast failures, and the swatch.black naming before any consumer touches
this. Track the dead-token cleanup, the `:active` state coverage, and the
image-hero pattern as the first follow-up wave.

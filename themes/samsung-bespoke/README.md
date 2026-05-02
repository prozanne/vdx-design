# Samsung Korea theme (`samsung-kr`)

Inspired by [samsung.com/sec](https://www.samsung.com/sec/). Black-dominant chrome with Samsung-blue accents, a heading-heavy display scale, and pill-shaped primary CTAs.

## Mood

- Premium, minimal, photo-led.
- Type and chrome stay quiet so product imagery can lead.
- Black does the heavy lifting; Samsung blue is reserved for accent and information moments.

## Color principles

- **Primary CTA** — pure black (`#000`) with white text. The pill shape and tight padding let it dominate without color noise.
- **Brand secondary** — Samsung blue (`#1428A0`). Used for hero eyebrows, info badges, and the occasional "highlight" CTA (`btn-accent`).
- **Brand accent** — brighter blue (`#2189FF`) for active/hover states only.
- **Promo red** (`#E12832`) — exclusively for sale badges. Never for body text or borders.
- **Neutrals** — a 9-step scale from `#FFFFFF` to `#000000`. Body text uses `neutral.900` (`#1A1A1A`) over white surfaces.

## Typography

- Headings use `SamsungSharpSans` first, then `SamsungOne`, with Korean fallbacks (`Pretendard`, `Apple SD Gothic Neo`, `Noto Sans KR`) and Latin system fonts.
- Display sizes (48 / 64 / 80 px) carry the page; body sticks to 16 px with a 18 px lead variant.
- Display + heading text is set with `letter-spacing: -0.02em` to feel intentional at large sizes.

## Layout

- Containers cap at 1280 px (`container`) or 1440 px (`container-wide`); heroes go full-bleed.
- 8-point grid with a 4 px base unit; the spacing scale skips intentionally to discourage in-between values.
- Cards are mostly flat; shadows are subtle and reserved for hover.

## Files

- `theme.json` — design tokens (source of truth).
- `tokens.css` — auto-generated CSS variables; regenerate with `npm run build:tokens`.
- `components.css` — pre-styled component classes (button, card, hero, nav, footer, …).
- `examples/landing.html` — a Galaxy-style product landing page.
- `examples/product-detail.html` — a single-product detail view.
- `examples/nav-footer.html` — the standalone navigation + footer pair, used as a smoke test.

## Caveats

- `SamsungOne` / `SamsungSharpSans` are proprietary. Pages render with the fallbacks on machines without them.
- Colors and proportions are inspired by samsung.com/sec but not pixel-matched. Treat this as a *design language*, not a clone.
- The theme version pins what was true at the time of capture (May 2026). When samsung.com/sec evolves, bump the version and refresh the tokens.

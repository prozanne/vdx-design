# Samsung Bespoke theme (`samsung-bespoke`)

Pastel-palette lifestyle theme inspired by Samsung Bespoke home appliances. Soft cream/linen surfaces, warm-wood accents, larger radii, and a serif display face.

This theme exists primarily as a stress test of the multi-theme architecture: the same HTML markup that renders as a stark Galaxy launch page under `samsung-kr` should render as a calm lifestyle page under `samsung-bespoke` with no code changes — only token swaps.

## Mood

- Warm, calm, photo-led — the inverse of `samsung-kr`'s stark Galaxy energy.
- Serif display face for editorial feel; sans body for legibility.
- Larger radii (8/16/24 vs 4/8/16), higher line-heights, softer shadows.
- Coffee-brown (`#2C2A28`) primary instead of pure black.

## Color principles

- **Primary CTA** — coffee-brown `#2C2A28` with cream text. Same pill shape as `samsung-kr`, but the contrast is gentler.
- **Brand secondary** — warm wood `#A88B6E`. Used for eyebrows, badges.
- **Brand accent** — peach `#D89C80`. Hover/active only.
- **Neutrals** — a 9-step warm scale from `#FBF8F5` to `#000000`.
- **Swatch palette** (`colors.swatch`) — sage / rose / linen / navy, mirroring Bespoke appliance finishes.

## Typography

- **Display** — `Cormorant Garamond` first, `Nanum Myeongjo` for Korean serif. Falls through to Georgia.
- **Sans** — same as `samsung-kr` (`SamsungOne` + Korean fallbacks).
- **Display scale** is 10–12% larger than `samsung-kr` (88/68/52 px) to lean into the editorial feel.

## Layout

- Container max widths: 680 / 1200 / 1440 (vs 720 / 1280 / 1440 in `samsung-kr`).
- Spacing scale identical to `samsung-kr`.
- Larger card radii (24 px) and softer shadows.

## Caveats

- The example HTML files are copied from `samsung-kr` to demonstrate the same markup rendering differently under each theme. A production-ready Bespoke theme would replace the imagery and copy with appliance-focused content.
- `Cormorant Garamond` and `Nanum Myeongjo` are not bundled fonts. On systems without them, the stack falls through to Georgia / serif and remains usable.

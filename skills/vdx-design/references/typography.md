# Typography

## Stacks

- **Sans (default body):** `var(--vdx-typography-font-family-sans)` — `SamsungOne` first, then Korean fallbacks (`Pretendard`, `Apple SD Gothic Neo`, `Noto Sans KR`), then Latin system fallbacks.
- **Display (headings, hero):** `var(--vdx-typography-font-family-display)` — `SamsungSharpSans` first, otherwise the same chain.
- **Mono (code, kbd):** `var(--vdx-typography-font-family-mono)` — `SF Mono` / `Menlo` / `Consolas`.

`SamsungOne` and `SamsungSharpSans` are proprietary. Pages render correctly on machines where they're installed; elsewhere they fall through cleanly.

## Scale

| Token        | Size | Use for                                                       |
| ------------ | ---- | ------------------------------------------------------------- |
| `displayXL`  | 80px | Marquee launches, brand campaigns, single-section heroes.     |
| `displayL`   | 64px | Standard hero headline.                                       |
| `displayM`   | 48px | Section openers in feature pages, dark highlight strips.      |
| `h1`         | 40px | Page title (in-flow, not hero).                               |
| `h2`         | 32px | Section heading.                                              |
| `h3`         | 24px | Card title, subsection heading.                               |
| `h4`         | 20px | Smallest visible heading (sidebar, footer column heads).      |
| `bodyL`      | 18px | Hero subhead, important lead paragraphs.                      |
| `bodyM`      | 16px | Default body copy.                                            |
| `bodyS`      | 14px | Captions in cards, footer links, secondary metadata.          |
| `caption`    | 12px | Eyebrow tags, fine print, image credits.                      |

## Weight choices

- **Display sizes** — always `bold` (700). Their visual job is to anchor the page.
- **`h1`/`h2`** — `bold` (700).
- **`h3`/`h4`** — `semibold` (600).
- **Body** — `regular` (400). Use `medium` (500) for emphasis sparingly; reserve `bold` for inline strong.
- **Buttons** — controlled by `components.button.fontWeight` token (semibold by default in samsung-kr).

## Letter spacing

- **Display + headings** — `tight` (`-0.02em`). Larger type looks loose by default; pulling in tightens it.
- **Body** — `normal` (`0`).
- **Eyebrows, badges, all-caps utility** — `wide` (`0.04em`). Improves uppercase legibility.

## Line height

- **Display + headings** — `tight` (`1.1`).
- **Body** — `normal` (`1.5`).
- **Long-form editorial paragraphs** — `relaxed` (`1.7`).

## Korean-specific notes

- Avoid `letter-spacing` on Korean-only paragraphs; it can break syllable rendering. The `letter-spacing-normal` token is set to `0` for that reason.
- Korean has no italics tradition; don't use `<em>` for emphasis. Use `font-weight: 500` or color shift instead.
- Mixed Korean+English copy: keep `font-size` constant; the cascade picks the correct glyphs per script.

## Don'ts

- Don't use display sizes inside cards or product tiles. They overpower the surrounding chrome.
- Don't apply tight letter-spacing to body — `bodyM` at `-0.02em` is unreadable.
- Don't introduce sizes outside the scale (`19px`, `22px`). If you need an in-between feel, switch to a different scale step or adjust line-height.

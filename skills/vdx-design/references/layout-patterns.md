# Layout Patterns

Patterns for whole-page composition. Mix and match — most Samsung-style pages stack 4–8 of these in vertical sequence.

## Page skeleton

```
<nav class="nav-bar"> … </nav>
<main>
  <section class="hero"> … </section>
  <section class="section"> [feature grid] </section>
  <section class="section surface-inverse"> [highlight strip] </section>
  <section class="section"> [product wall] </section>
  <section class="section"> [editorial content] </section>
</main>
<footer class="footer"> … </footer>
```

## Breakpoint behaviour

The `.container` (1280px) and `.container-wide` (1440px) constrain content width. Below 1024px, `.grid-4` collapses to two columns; below 768px, all `.grid-*` collapse to one column.

## Hero

Full-bleed section with text on the left, optional product image on the right.

- Use `display-l` (64 px) by default; reserve `display-xl` (80 px) for marquee launches.
- Set the eyebrow with `.hero-eyebrow` — a small uppercase tag that uses brand-secondary.
- Two CTAs maximum. First is `.btn-primary`, second is `.btn-secondary`.
- For dark variant, add `.surface-inverse` on the section — text colors auto-flip.

## Feature grid

Three columns of compact cards. Each card has a small icon/number, an `<h3>`, a one-paragraph body, and an optional link.

```html
<section class="section">
  <div class="container">
    <h2 class="text-center mb-12">왜 Galaxy 인가요?</h2>
    <div class="grid grid-3">
      <div class="card card-flat">
        <div class="caption">01</div>
        <h3>강력한 AI</h3>
        <p>온디바이스에서 즉시 동작하는 Galaxy AI 기능들.</p>
      </div>
      <!-- 2 more -->
    </div>
  </div>
</section>
```

## Product wall

Four-column grid of `.product-card`. Below 1024 px → 2 columns. Use this for category landing pages.

## Editorial content

Long-form copy needs more breathing room than the default. Apply `.body-l` to paragraphs, cap `<p>` width at 720 px, use generous `margin-bottom: var(--vdx-spacing-6)`.

## Highlight strip

Full-width inverse section that breaks up white sections. Single `<h2 class="display-m">` plus a one-line subhead and a single CTA.

```html
<section class="section surface-inverse text-center">
  <div class="container">
    <h2 class="display-m">갤럭시와 함께라면, 어디든 가능합니다.</h2>
    <p class="body-l">전국 어디서나 24시간 케어 서비스.</p>
    <a class="btn btn-accent btn-lg mt-8" href="#">서비스 알아보기</a>
  </div>
</section>
```

## Form section (lead capture, login)

Centred 480 px column with `.label` + `.input` rows and a single `.btn-primary` at the bottom.

## Spacing rhythm

- Between sections: `padding-block: var(--vdx-spacing-20)` (default in `.section`).
- Inside a section, between heading and grid: `margin-bottom: var(--vdx-spacing-12)`.
- Between cards: `gap: var(--vdx-spacing-6)` (default in `.grid`).
- Between paragraph and following element: `margin-bottom: var(--vdx-spacing-4)`.

## Don'ts

- Don't put more than two `.btn-primary` on a page — primary means "the one CTA".
- Don't mix `.surface-inverse` and `.btn-secondary` (border is dark, invisible). Use `.btn-accent` or `.btn-primary` on dark surfaces.
- Don't nest containers (`.container` inside `.container-wide`). Pick one per section.
- Don't apply `letter-spacing-tight` to body copy — it's intended for displays only.

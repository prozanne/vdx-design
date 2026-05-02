# Component Library

Every component lives in `themes/<id>/components.css`. Markup uses semantic HTML plus the listed classes. All values are token-driven, so the same markup looks correct under any registered theme.

## Buttons

```html
<a class="btn btn-primary" href="#">자세히 보기</a>
<a class="btn btn-secondary" href="#">더 알아보기</a>
<a class="btn btn-ghost" href="#">건너뛰기</a>
<a class="btn btn-accent" href="#">사전예약 하기</a>
<a class="btn btn-link" href="#">자세히 보기 →</a>
```

Sizes: `.btn-sm` (36 px), default (48 px), `.btn-lg` (56 px). Combine with any variant.

| Variant     | Use for                                                |
| ----------- | ------------------------------------------------------ |
| `primary`   | The page's main CTA. One per section.                  |
| `secondary` | Important actions that aren't the primary path.        |
| `ghost`     | Utility actions (filter, sort, dismiss).               |
| `accent`    | Brand-highlight CTA — pre-orders, launches, campaigns. |
| `link`      | Inline "learn more"-style links.                       |

## Cards

```html
<div class="card">
  <h3>심플 카드</h3>
  <p class="text-muted">기본 카드는 가벼운 보더와 함께 페이퍼 같은 느낌을 줍니다.</p>
  <a class="btn btn-link" href="#">자세히 보기 →</a>
</div>

<div class="card card-flat">
  <h3>플랫 카드</h3>
  <p>보더와 그림자 없이, 배경 컬러만으로 영역을 구분합니다.</p>
</div>

<article class="card card-media">
  <!-- Replace alt with a real description of the image (or empty `alt=""` if
       the image is purely decorative AND the surrounding text fully conveys
       the meaning). -->
  <img src="hero.jpg" alt="갤럭시 단말 라인업 메인 이미지">
  <div class="card-body">
    <h3>미디어 카드</h3>
    <p class="text-muted">상단 4:3 이미지 + 본문 카피.</p>
  </div>
</article>
```

## Product card

For e-commerce style listings:

```html
<article class="product-card">
  <div class="image"><img src="galaxy-z-flip6.png" alt="Galaxy Z Flip6"></div>
  <div class="body">
    <span class="badge badge-new">NEW</span>
    <div class="name">Galaxy Z Flip6</div>
    <p class="caption">접고 펼치는 새로운 경험</p>
    <div class="price"><span class="price-old">1,485,000원</span> 1,398,000원</div>
    <a class="btn btn-primary btn-sm">구매하기</a>
  </div>
</article>
```

Use a real `alt` describing the product (the bare product name is fine — the same name in body text isn't read by screen readers when "next image"-stepping). Empty `alt=""` is correct only for purely decorative imagery.

## Inputs

```html
<label class="label" for="email">이메일</label>
<input id="email" class="input" type="email" placeholder="you@example.com">
```

## Navigation bar

```html
<nav class="nav-bar" aria-label="주요 메뉴">
  <div class="container-wide">
    <a class="nav-brand" href="/" aria-label="Samsung 홈">SAMSUNG</a>
    <ul class="nav-links">
      <li><a href="#">스마트폰</a></li>
      <li><a href="#">TV/AV</a></li>
      <li><a href="#">생활가전</a></li>
      <li><a href="#">컴퓨터</a></li>
      <li><a href="#">액세서리</a></li>
    </ul>
    <div class="nav-actions">
      <a class="btn btn-ghost btn-sm" href="#">검색</a>
      <a class="btn btn-primary btn-sm" href="#">로그인</a>
    </div>
  </div>
</nav>
```

The nav is sticky by default. Place it as the very first child of `<body>`. Always set `aria-label` on the `<nav>` (a screen reader hears every nav as "navigation" otherwise) and on the wordmark link, since the only accessible name otherwise is the literal string "SAMSUNG".

### Mobile drawer

Below the tablet breakpoint, `.nav-links` is hidden. Use the `.nav-drawer` skeleton (a native `<details>`/`<summary>` pair) for the mobile menu — works without JS, accessible by default, opens an inline-flow panel below the bar:

```html
<details class="nav-drawer">
  <summary aria-label="메뉴">≡</summary>
  <ul>
    <li><a href="#">스마트폰</a></li>
    <li><a href="#">TV/AV</a></li>
    <li><a href="#">생활가전</a></li>
  </ul>
</details>
```

Place it before `.nav-links` in the markup so the bar reads "brand → drawer → links → actions" in source order. Consumers can swap `<details>` for a JS-driven drawer if they want richer animation; the CSS above only styles the native primitive.

## Footer

```html
<footer class="footer">
  <div class="container-wide">
    <div class="grid grid-4">
      <div>
        <h4>제품</h4>
        <ul><li><a href="#">스마트폰</a></li><li><a href="#">TV</a></li></ul>
      </div>
      <div>
        <h4>지원</h4>
        <ul><li><a href="#">고객센터</a></li><li><a href="#">서비스 센터 찾기</a></li></ul>
      </div>
      <div>
        <h4>회사</h4>
        <ul><li><a href="#">회사 소개</a></li><li><a href="#">뉴스</a></li></ul>
      </div>
      <div>
        <h4>법적 고지</h4>
        <ul><li><a href="#">개인정보 처리방침</a></li><li><a href="#">이용약관</a></li></ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Samsung Electronics Co., Ltd.</span>
      <span>대한민국 / 한국어</span>
    </div>
  </div>
</footer>
```

## Hero

```html
<section class="hero">
  <div class="container-wide">
    <div class="hero-content">
      <div class="hero-eyebrow">Galaxy AI</div>
      <h1 class="display-l">새로운 차원의 모바일 AI</h1>
      <p>실시간 통역, 사진 편집, 텍스트 요약까지. Galaxy가 도와드립니다.</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="#">지금 구매하기</a>
        <a class="btn btn-secondary btn-lg" href="#">자세히 알아보기</a>
      </div>
    </div>
  </div>
</section>
```

For dark heroes, add `.surface-inverse` to the `<section>`.

## Badges

```html
<span class="badge badge-promo">SALE</span>
<span class="badge badge-new">NEW</span>
<span class="badge badge-info">출시 예정</span>
```

## Containers

```html
<div class="container">…</div>          <!-- 1280px reading-comfortable column -->
<div class="container-wide">…</div>     <!-- 1440px wide product wall, hero, nav -->
<div class="container-narrow">…</div>   <!-- 720px form / single-card / prose column -->
```

Pick exactly one per section. `.container-narrow` is sized via the `--vdx-layout-narrow` token; the same value drives the `.hero-content` text column, so a centered form and a hero copy block share the same column width.

## Focus rings

Every interactive surface inherits a 2 px `outline` on `:focus-visible` keyed off `--vdx-colors-brand-accent`. The selector list lives in `components.css` and currently covers `.btn`, `.btn-link`, `.input`, `.nav-links a`, and `[role="button"]`. New interactive elements are picked up automatically when they match that list — for custom widgets, add the element's selector to the same rule rather than rolling a new ring.

## Common combinations

- **Feature grid:** `.section` > `.container` > `.grid.grid-3` of `.card-flat` blocks.
- **Product wall:** `.section` > `.container-wide` > `.grid.grid-4` of `.product-card`.
- **Newsletter row:** `.section.surface-inverse` > centred `.container` with a label, input, and accent button.
- **Single-card form:** `.section` > `.container-narrow` > `.card` with `.label` + `.input` + `.btn-primary`.

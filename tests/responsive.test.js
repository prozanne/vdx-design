// Responsive smoke tests. We don't run a real browser here (would add a
// Playwright/Puppeteer dep); instead we read the CSS, parse the @media queries
// that target known mobile/tablet widths, and assert the rules that MUST exist
// (e.g. .nav-links collapses below tablet). This is a static check of the
// responsive contract — the real visual verification happens in
// docs/screenshots/, captured by the Playwright run during development.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const components = readFileSync(resolve("themes/samsung-kr/components.css"), "utf8");

function rulesUnderMedia(css, mediaPattern) {
  // Find `@media <pattern> { ... }` blocks. The previous implementation
  // closed the block at the FIRST `\n}` it saw, which silently bypassed
  // minified CSS (no newline before the closing brace) and unusual
  // whitespace, AND it stopped early when an inner rule's `}` happened to
  // sit on its own line — yielding an empty/partial block string.
  //
  // Replacement: locate the `@media` literal that matches, then walk the
  // characters from the first `{` and track brace depth. The block ends
  // when depth returns to zero. Strings/escapes inside CSS aren't a concern
  // here — components.css is hand-authored and contains no `}` inside
  // string literals — so a plain depth scanner is sufficient.
  const headerRegex = new RegExp(`@media\\s*${mediaPattern}\\s*\\{`, "g");
  const blocks = [];
  let m;
  while ((m = headerRegex.exec(css)) !== null) {
    const open = m.index + m[0].length - 1; // position of the `{`
    let depth = 1;
    let i = open + 1;
    for (; i < css.length; i++) {
      const ch = css[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue; // unbalanced — skip rather than throw
    blocks.push(css.slice(open + 1, i));
  }
  return blocks;
}

test("desktop nav-links are hidden below tablet width", () => {
  // Look for a media query that targets the tablet breakpoint or smaller and
  // sets .nav-links { display: none }.
  const blocks = rulesUnderMedia(components, "\\(max-width:\\s*7\\d{2}px\\)");
  assert.ok(blocks.length > 0, "expected at least one max-width: <768px media block");
  const collapses = blocks.some(b => b.includes(".nav-links") && /display:\s*none/.test(b));
  assert.ok(collapses, "expected `.nav-links { display: none }` inside the mobile media block");
});

test("grid-4 collapses to two columns below laptop width", () => {
  const blocks = rulesUnderMedia(components, "\\(max-width:\\s*1024px\\)");
  assert.ok(blocks.length > 0, "expected at least one max-width: 1024px media block");
  const collapses = blocks.some(b => b.includes(".grid-4") && b.includes("grid-template-columns: repeat(2,"));
  assert.ok(collapses, "expected `.grid-4 { grid-template-columns: repeat(2, ...) }` at laptop width");
});

test("grid-2/3/4 collapse to one column below tablet width", () => {
  const blocks = rulesUnderMedia(components, "\\(max-width:\\s*768px\\)");
  assert.ok(blocks.length > 0, "expected a max-width: 768px media block");
  const ok = blocks.some(b => b.includes(".grid-2, .grid-3, .grid-4") && b.includes("grid-template-columns: 1fr"));
  assert.ok(ok, "expected `.grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr }` at mobile");
});

test("nav-bar uses sticky positioning so it survives scroll", () => {
  assert.match(components, /\.nav-bar\s*\{[^}]*position:\s*sticky/);
});

test("hover effects are gated on (hover: hover) so they don't fire on touch", () => {
  assert.match(components, /@media\s*\(hover:\s*hover\)/);
});

test("focus-visible ring covers btn / btn-link / input / nav-links a / [role=button]", () => {
  // Single rule list, all five selectors expected.
  const m = components.match(/(\.btn:focus-visible[\s\S]*?\{[^}]*\})/);
  assert.ok(m, "expected a focus-visible rule starting with .btn:focus-visible");
  const rule = m[1];
  for (const sel of [".btn:focus-visible", ".btn-link:focus-visible", ".input:focus-visible", ".nav-links a:focus-visible", '[role="button"]:focus-visible']) {
    assert.match(rule, new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing focus-visible target: ${sel}`);
  }
});

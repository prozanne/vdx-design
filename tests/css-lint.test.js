// Lightweight CSS linter for components.css. Catches the regressions a hand
// review misses: literal hex/length values, !important, unused custom
// properties, and rules that reference tokens that don't exist in tokens.css.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const components = readFileSync(resolve("themes/samsung-kr/components.css"), "utf8");
const tokens = readFileSync(resolve("themes/samsung-kr/tokens.css"), "utf8");

// Strip /* ... */ comments before linting so a comment that mentions a hex
// (e.g. "/* mint #B5D9C4 */") isn't a false positive.
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const cssNoComments = stripComments(components);

test("components.css uses !important only inside prefers-reduced-motion", () => {
  // !important defeats the cascade. The single legitimate exception is
  // `@media (prefers-reduced-motion: reduce)` where the override has to win
  // against ALL author rules per accessibility guidance. Anywhere else
  // means a specificity smell that should be fixed structurally.
  //
  // The block can contain MULTIPLE inner rules, so we count braces to find
  // the matching `}`. A naive non-greedy regex stops at the first inner `}`
  // and falsely flags later !important uses inside the same block.
  const start = cssNoComments.indexOf("@media (prefers-reduced-motion: reduce)");
  let cssOutsideRMM = cssNoComments;
  if (start !== -1) {
    const openBrace = cssNoComments.indexOf("{", start);
    let depth = 0;
    let i = openBrace;
    for (; i < cssNoComments.length; i++) {
      const ch = cssNoComments[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    cssOutsideRMM = cssNoComments.slice(0, start) + cssNoComments.slice(i);
  }
  assert.equal(
    /!important/.test(cssOutsideRMM),
    false,
    "components.css uses !important outside prefers-reduced-motion (specificity smell)",
  );
});

test("components.css contains no literal hex colors outside hardcoded fallbacks", () => {
  // Allow the SVG-data-URL image fallbacks (none currently used). Otherwise
  // every color must come from a CSS variable.
  const matches = cssNoComments.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepEqual(
    matches,
    [],
    `components.css contains literal hex colors: ${matches.join(", ")}`,
  );
});

test("components.css contains very few literal length values", () => {
  // Some literals are unavoidable (1px borders, 36px swatches inside page-
  // local styles, container max-widths during layout). We allow a small
  // budget but flag growth so a future regression like "100px hero padding"
  // gets caught.
  //
  // Match \d+px outside var() and outside @media expressions. Strip @media
  // and url() and var() first.
  let stripped = cssNoComments
    .replace(/@media[^{]+\{/g, "")     // strip media query expressions
    .replace(/var\([^)]*\)/g, "")       // strip var() refs
    .replace(/url\([^)]*\)/g, "")       // strip url() refs
    .replace(/-?\d+\s*\/\s*\d+/g, "");  // strip aspect-ratio fractions like 4 / 3

  const matches = stripped.match(/-?\d+(?:\.\d+)?(?:px|rem|em)\b/g) || [];

  // Budget: allow up to 25 literals (current count is ~20 — borders, sticky
  // top:0, container max-widths, 2px focus rings, 1.25rem list padding). Bump
  // this only with an explanation in the diff.
  assert.ok(
    matches.length <= 25,
    `components.css uses ${matches.length} literal length values (budget 25): ${matches.slice(0, 30).join(", ")}`,
  );
});

test("every var() reference in components.css resolves to a token", () => {
  // Already covered by samsung-theme.test.js but pinned here too so this file
  // is the single source of truth for "components.css is well-formed".
  const referenced = new Set(
    [...cssNoComments.matchAll(/var\((--vdx-[a-zA-Z0-9-]+)/g)].map(m => m[1]),
  );
  const defined = new Set(
    [...tokens.matchAll(/(--vdx-[a-zA-Z0-9-]+):/g)].map(m => m[1]),
  );
  const missing = [...referenced].filter(v => !defined.has(v));
  assert.deepEqual(missing, [], `unresolved CSS variables: ${missing.join(", ")}`);
});

test("no token defined in tokens.css is silently unused by components.css OR examples", () => {
  // A defined-but-never-used token is dead weight. Unused tokens are tolerable
  // (a contributor may want them available for one-off page styles) but we
  // surface them so the team has a chance to prune. Strict equality would be
  // too aggressive; instead, document the unused set as a list so a future PR
  // can review it intentionally.
  const defined = [...tokens.matchAll(/(--vdx-[a-zA-Z0-9-]+):/g)].map(m => m[1]);
  const examplesGlob = readFileSync(
    resolve("themes/samsung-kr/examples/landing.html"), "utf8",
  ) + readFileSync(
    resolve("themes/samsung-kr/examples/product-detail.html"), "utf8",
  ) + readFileSync(
    resolve("themes/samsung-kr/examples/nav-footer.html"), "utf8",
  ) + readFileSync(
    resolve("themes/samsung-kr/examples/galaxy-s26.html"), "utf8",
  );
  const haystack = cssNoComments + examplesGlob;

  const unused = defined.filter(name => !haystack.includes(name));

  // Soft budget: most theme tokens should be referenced somewhere. We allow
  // up to 40 unused — the rationale is that the schema requires complete
  // scales (every shadow step, every neutral step, every font weight, every
  // breakpoint as a token) so contributors can reach for any rung when
  // composing one-off page styles. Without this slack, the test would force
  // components.css to consume the entire scale just to satisfy the linter.
  // Bump only with an explanation.
  assert.ok(
    unused.length <= 40,
    `${unused.length} unused tokens (budget 40): ${unused.slice(0, 50).join(", ")}`,
  );
});

test("@media query breakpoint values come from the theme token scale", () => {
  // Pulled directly: a media query `(max-width: 999px)` is a smell. They
  // should match one of the theme breakpoints (-1px is the standard
  // exclusive-upper convention).
  const allowed = new Set([
    // Each breakpoint in samsung-kr theme.json:
    "360", "768", "1024", "1440", "1920",
    // Plus the exclusive form (breakpoint - 1) used for "below tablet" etc.:
    "359", "767", "1023", "1439", "1919",
  ]);
  const matches = [...cssNoComments.matchAll(/@media[^{]*\(\s*(?:max|min)-width:\s*(\d+)px/g)];
  for (const m of matches) {
    const bp = m[1];
    assert.ok(
      allowed.has(bp),
      `media query uses non-standard breakpoint ${bp}px (allowed: ${[...allowed].sort((a,b)=>+a-+b).join(", ")})`,
    );
  }
});

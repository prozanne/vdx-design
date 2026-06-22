// Lightweight CSS linter for components.css. Catches the regressions a hand
// review misses: literal hex/length values, !important, unused custom
// properties, and rules that reference tokens that don't exist in tokens.css.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

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

// ---- snapshot-pinned counts -------------------------------------------------
//
// The previous form ("≤25 lengths, ≤40 unused") was a SOFT budget: any
// regression up to the cap landed silently. Replaced with EQUALITY against
// tests/fixtures/css-lint-baseline.json, computed per theme. A change to
// either count fails the test. Run with UPDATE_SNAPSHOTS=true to rewrite the
// baseline (review the diff before committing).

const BASELINE_PATH = resolve("tests/fixtures/css-lint-baseline.json");

function countLiteralLengths(cssNoCommentsLocal) {
  // Some literals are unavoidable (1px borders, 36px swatches, container
  // max-widths). We pin EXACT count rather than a budget so any new literal
  // is forced through review.
  let stripped = cssNoCommentsLocal
    .replace(/@media[^{]+\{/g, "")     // strip media query expressions
    .replace(/var\([^)]*\)/g, "")       // strip var() refs
    .replace(/url\([^)]*\)/g, "")       // strip url() refs
    .replace(/-?\d+\s*\/\s*\d+/g, "");  // strip aspect-ratio fractions like 4 / 3
  return (stripped.match(/-?\d+(?:\.\d+)?(?:px|rem|em)\b/g) || []).length;
}

function countUnusedTokens(themeDir) {
  const tcss = readFileSync(resolve(themeDir, "tokens.css"), "utf8");
  const ccss = stripComments(readFileSync(resolve(themeDir, "components.css"), "utf8"));
  const defined = [...tcss.matchAll(/(--vdx-[a-zA-Z0-9-]+):/g)].map(m => m[1]);
  const examplesDir = resolve(themeDir, "examples");
  let examplesGlob = "";
  if (existsSync(examplesDir)) {
    for (const f of readdirSync(examplesDir)) {
      if (f.endsWith(".html")) examplesGlob += readFileSync(join(examplesDir, f), "utf8");
    }
  }
  const haystack = ccss + examplesGlob;
  return defined.filter(name => !haystack.includes(name)).length;
}

function computeCountsForTheme(name) {
  const dir = resolve("themes", name);
  const ccss = stripComments(readFileSync(resolve(dir, "components.css"), "utf8"));
  return {
    lengths: countLiteralLengths(ccss),
    unusedTokens: countUnusedTokens(dir),
  };
}

const TRACKED_THEMES = ["samsung-kr", "samsung-bespoke"];

test("css-lint counts match snapshot baseline (run with UPDATE_SNAPSHOTS=true to refresh)", () => {
  const actual = Object.fromEntries(
    TRACKED_THEMES.map(t => [t, computeCountsForTheme(t)]),
  );

  if (process.env.UPDATE_SNAPSHOTS === "true") {
    writeFileSync(BASELINE_PATH, JSON.stringify(actual, null, 2) + "\n");
    return; // intentional rewrite — no further assertion this run
  }

  assert.ok(
    existsSync(BASELINE_PATH),
    `missing baseline: run \`UPDATE_SNAPSHOTS=true npm test\` to generate ${BASELINE_PATH}`,
  );
  const expected = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  assert.deepEqual(
    actual,
    expected,
    "css-lint counts diverged from baseline — review the diff and run UPDATE_SNAPSHOTS=true if intentional",
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

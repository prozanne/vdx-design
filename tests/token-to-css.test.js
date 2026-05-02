import { test } from "node:test";
import assert from "node:assert/strict";
import { themeToCss, compareKeys } from "../lib/token-to-css.js";

// Minimal theme used for ordering tests — only the spacing group matters.
function makeTheme(spacingKeys) {
  const spacing = {};
  for (const k of spacingKeys) spacing[k] = `${k}px`;
  return {
    id: "ord", name: "Ordering", version: "0.0.0",
    colors: {
      brand: { primary: "#000", primaryHover: "#000", secondary: "#000", accent: "#000" },
      neutral: { "0": "#000", "50": "#000", "100": "#000", "200": "#000", "300": "#000", "500": "#000", "700": "#000", "900": "#000", "1000": "#000" },
      semantic: { success: "#000", warning: "#000", danger: "#000", info: "#000" },
      surface: { page: "#000", card: "#000", elevated: "#000", inverse: "#000" },
      text: { primary: "#000", secondary: "#000", muted: "#000", onBrand: "#000", onInverse: "#000" },
      border: { subtle: "#000", default: "#000", strong: "#000", inverse: "#000" },
    },
    typography: {
      fontFamily: { sans: "x", display: "x", mono: "x" },
      fontSize: { caption: "1px", bodyS: "1px", bodyM: "1px", bodyL: "1px", h4: "1px", h3: "1px", h2: "1px", h1: "1px", displayM: "1px", displayL: "1px", displayXL: "1px" },
      lineHeight: { tight: "1", normal: "1", relaxed: "1" },
      // Mirror real values so a regression in the fontWeight pattern is
      // catchable from this fixture (all-400 hides it).
      fontWeight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
      letterSpacing: { tight: "0", normal: "0", wide: "0" },
    },
    spacing,
    radius: { none: "0", sm: "0", md: "0", lg: "0", pill: "0" },
    shadow: { none: "none", sm: "x", md: "x", lg: "x" },
    motion: { duration: { fast: "1ms", base: "1ms", slow: "1ms" }, easing: { standard: "x", emphasized: "x" } },
    breakpoints: { mobile: "1px", tablet: "1px", laptop: "1px", desktop: "1px", xl: "1px" },
    components: {
      button: { height: "1px", paddingX: "1px", radius: "0", fontWeight: "400" },
      input: { height: "1px", paddingX: "1px", radius: "0", borderColor: "#000" },
      card: { padding: "1px", radius: "0", shadow: "none" },
      nav: { height: "1px", background: "#000", color: "#000" },
      footer: { background: "#000", color: "#000" },
    },
  };
}

test("themeToCss orders spacing variables numerically (spacing-2 before spacing-10)", () => {
  const css = themeToCss(makeTheme(["0", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"]));
  const ix = (key) => css.indexOf(`--vdx-spacing-${key}:`);
  assert.ok(ix("2") < ix("10"), "spacing-2 must appear before spacing-10");
  assert.ok(ix("8") < ix("10"), "spacing-8 must appear before spacing-10");
  assert.ok(ix("100") < 0, "spacing-100 not present in fixture");
});

test("themeToCss preserves alphabetical grouping across non-numeric keys", () => {
  const css = themeToCss(makeTheme(["0", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"]));
  // shadow-lg should come before shadow-md should come before shadow-none should come before shadow-sm
  // (alphabetical within shadow/* group), and *all* shadow lines should be contiguous.
  const lines = css.split("\n").map(l => l.trim());
  const shadowLines = lines.filter(l => l.startsWith("--vdx-shadow-"));
  assert.deepEqual(shadowLines.map(l => l.split(":")[0]).sort(), shadowLines.map(l => l.split(":")[0]),
    "shadow-* keys must be alphabetical");
});

test("themeToCss output is byte-identical across repeated invocations", () => {
  const t = makeTheme(["0", "1", "2", "10", "100"]);
  const a = themeToCss(t);
  const b = themeToCss(t);
  assert.equal(a, b);
});

test("compareKeys handles digit runs longer than Number.MAX_SAFE_INTEGER", () => {
  const a = "x99999999999999999991"; // 20 digits, > MAX_SAFE_INTEGER
  const b = "x99999999999999999992";
  assert.ok(compareKeys(a, b) < 0, "20-digit suffix .91 must come before .92");
  assert.ok(compareKeys(b, a) > 0);
});

test("compareKeys orders different-length numerics by magnitude, not by string", () => {
  assert.ok(compareKeys("a9", "a10") < 0, "a9 < a10");
  assert.ok(compareKeys("a99", "a100") < 0, "a99 < a100");
  assert.ok(compareKeys("a100", "a99") > 0);
});

test("compareKeys gives leading-zero-equivalent keys distinct stable order", () => {
  // "09" and "9" share the same magnitude; both are accepted only by `^[0-9]+$`
  // schemas. The comparator must give a stable, non-zero ordering.
  const cmp = compareKeys("a09", "a9");
  assert.notEqual(cmp, 0, "compareKeys must not return 0 for distinct keys");
});

test("compareKeys is antisymmetric across the same input pair", () => {
  for (const [a, b] of [["spacing-2", "spacing-10"], ["foo", "bar"], ["a", "ab"]]) {
    const ab = compareKeys(a, b);
    const ba = compareKeys(b, a);
    assert.equal(Math.sign(ab), -Math.sign(ba), `compareKeys(${a},${b})=${ab} but compareKeys(${b},${a})=${ba}`);
  }
});

test("themeToCss kebab-cases camelCase top-level group keys", () => {
  // Without this, a group named e.g. `zIndex` or `motionTokens` would emit
  // `--vdx-zIndex-*` instead of the expected `--vdx-z-index-*`. The fix is in
  // lib/token-to-css.js where the outer flatten() call runs camelToKebab on
  // the group name. Pin it here so a regression is caught even if zIndex is
  // later renamed away.
  const t = makeTheme(["0", "1", "2"]);
  // Inject a synthetic camelCase group. themeToCss derives the group set from
  // theme keys, so this is a fair test of the kebab path.
  t.fooBarBaz = { qux: "1px" };
  const css = themeToCss(t);
  assert.match(css, /--vdx-foo-bar-baz-qux:\s*1px/);
  assert.equal(/--vdx-fooBarBaz/.test(css), false, "expected camelCase group to NOT appear verbatim");
});

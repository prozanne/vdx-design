// WCAG 2.1 contrast audit for the samsung-kr theme.
//
// Walks every documented text/surface combination in theme.json and asserts
// the contrast ratio meets the level we promised:
//   - AA normal body text: ≥ 4.5:1
//   - AA large text (≥ 18pt regular or 14pt bold ≈ 24/19 px): ≥ 3:1
//
// The test is a static analysis of the tokens, not a render check. It catches
// the class of accessibility regressions that's invisible to manual review:
// "we tweaked text-muted from #767676 to #8A8A8A and dropped to 3.99:1".

import { test } from "node:test";
import assert from "node:assert/strict";
import { getTheme } from "../lib/theme-registry.js";

// Parse `#RGB` / `#RGBA` / `#RRGGBB` / `#RRGGBBAA` into [r, g, b] in 0..255.
// Alpha channel is dropped — contrast is computed against opaque foreground/
// background, since translucent text is a separate accessibility concern that
// depends on the layer composition behind it.
function parseHex(hex) {
  const h = hex.replace(/^#/, "");
  if (h.length === 3 || h.length === 4) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  if (h.length === 6 || h.length === 8) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  throw new Error(`Unsupported hex form: ${hex}`);
}

// WCAG relative luminance per https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function luminance([r, g, b]) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg, bg) {
  const L1 = luminance(parseHex(fg));
  const L2 = luminance(parseHex(bg));
  const [bright, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (bright + 0.05) / (dark + 0.05);
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

// Setup guard: make load failure point at THIS test (with the JSON path of
// the missing token), not at one of the dynamic per-pair tests below — those
// would otherwise blow up with `Cannot read properties of undefined` and the
// label-only test name wouldn't tell you what's missing.
let theme, c;
test("contrast: setup", () => {
  theme = getTheme("samsung-kr");
  assert.ok(theme, "getTheme('samsung-kr') returned null/undefined");
  c = theme.colors;
  for (const path of [
    "colors.text.primary", "colors.text.secondary", "colors.text.muted",
    "colors.text.onBrand", "colors.text.onInverse", "colors.text.onInverseSecondary",
    "colors.surface.page", "colors.surface.card", "colors.surface.elevated", "colors.surface.inverse",
    "colors.brand.primary", "colors.brand.secondary", "colors.brand.accent",
    "colors.semantic",
    "components.nav.color", "components.nav.background",
    "components.footer.color", "components.footer.background",
  ]) {
    const value = path.split(".").reduce((o, k) => (o == null ? o : o[k]), theme);
    assert.ok(
      value !== undefined && value !== null,
      `theme.${path} is missing — required for contrast audit`,
    );
  }
});

// Resolve a dotted path against the theme. Returns undefined if any step is
// missing so the per-pair test can skip-with-message rather than crash.
function pick(path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), theme);
}

// Each row: [fgPath, bgPath, level, label]. Storing paths (not values) defers
// the lookup until the test runs, so a missing token is reported with the
// exact JSON path instead of crashing module-load.
const COMBINATIONS = [
  // Body copy on light surfaces — AA normal
  ["colors.text.primary",   "colors.surface.page",     AA_NORMAL, "colors.text.primary on colors.surface.page"],
  ["colors.text.primary",   "colors.surface.card",     AA_NORMAL, "colors.text.primary on colors.surface.card"],
  ["colors.text.primary",   "colors.surface.elevated", AA_NORMAL, "colors.text.primary on colors.surface.elevated"],
  ["colors.text.secondary", "colors.surface.page",     AA_NORMAL, "colors.text.secondary on colors.surface.page"],
  ["colors.text.secondary", "colors.surface.card",     AA_NORMAL, "colors.text.secondary on colors.surface.card"],
  ["colors.text.muted",     "colors.surface.page",     AA_NORMAL, "colors.text.muted on colors.surface.page"],
  ["colors.text.muted",     "colors.surface.card",     AA_NORMAL, "colors.text.muted on colors.surface.card"],

  // Inverse copy on dark surfaces — AA normal
  ["colors.text.onInverse",          "colors.surface.inverse", AA_NORMAL, "colors.text.onInverse on colors.surface.inverse"],
  ["colors.text.onInverseSecondary", "colors.surface.inverse", AA_NORMAL, "colors.text.onInverseSecondary on colors.surface.inverse"],

  // Brand text on brand backgrounds — AA normal
  ["colors.text.onBrand", "colors.brand.primary",   AA_NORMAL, "colors.text.onBrand on colors.brand.primary"],
  ["colors.text.onBrand", "colors.brand.secondary", AA_NORMAL, "colors.text.onBrand on colors.brand.secondary"],

  // Component-level — AA normal where the role is body/label, AA large for big CTAs.
  ["components.nav.color",    "components.nav.background",    AA_NORMAL, "components.nav.color on components.nav.background"],
  ["components.footer.color", "components.footer.background", AA_NORMAL, "components.footer.color on components.footer.background"],
];

for (const [fgPath, bgPath, level, label] of COMBINATIONS) {
  test(`contrast ${label} ≥ ${level}:1`, (t) => {
    const fg = pick(fgPath);
    const bg = pick(bgPath);
    if (fg == null || bg == null) {
      t.skip(`missing token: ${fg == null ? fgPath : bgPath}`);
      return;
    }
    const ratio = contrast(fg, bg);
    assert.ok(
      ratio >= level,
      `${label}: ${fg} on ${bg} → ${ratio.toFixed(2)}:1 (need ${level}:1)`,
    );
  });
}

// Brand-secondary (Samsung blue #1428A0) is too dark for white-on-blue large
// text? Actually it's plenty dark; just confirm the pin.
test("brand.secondary is dark enough for white text", (t) => {
  const v = pick("colors.brand.secondary");
  if (v == null) { t.skip("missing colors.brand.secondary"); return; }
  const ratio = contrast("#FFFFFF", v);
  assert.ok(ratio >= 4.5, `colors.brand.secondary contrast with white = ${ratio.toFixed(2)}:1`);
});

// brand.accent is a brighter blue meant for hover/active states — it MAY fail
// AA against white. Document the actual ratio so a future tightening notices.
test("brand.accent ratio against white is documented (may be < AA)", (t) => {
  const v = pick("colors.brand.accent");
  if (v == null) { t.skip("missing colors.brand.accent"); return; }
  const ratio = contrast("#FFFFFF", v);
  // We don't require AA here, just record the ratio. A future change that
  // pushes accent darker should re-check whether to require AA.
  assert.ok(ratio > 1, `colors.brand.accent vs white = ${ratio.toFixed(2)}:1`);
});

// Semantic colors are background fills (badges, alerts, banners). The
// contract is that pairing the color with EITHER white text OR text.primary
// must clear AA normal — so a downstream component picks whichever works.
// This is intentionally weaker than "readable as foreground on white,"
// because most real-world uses are background-strength fills, not body text.
//
// Wrapped in its own test() so the iteration happens at run time (after the
// setup guard has populated `theme`/`c`) rather than at module load.
test("semantic colors pair with white OR text.primary at AA normal", () => {
  const semantic = pick("colors.semantic");
  assert.ok(semantic && typeof semantic === "object", "colors.semantic missing");
  const onBrand  = pick("colors.text.onBrand");
  const onPrim   = pick("colors.text.primary");
  for (const [name, color] of Object.entries(semantic)) {
    const onWhite = contrast(onBrand, color);
    const onDark  = contrast(onPrim, color);
    const best = Math.max(onWhite, onDark);
    assert.ok(
      best >= AA_NORMAL,
      `colors.semantic.${name}: best pairing = ${best.toFixed(2)}:1 (white=${onWhite.toFixed(2)}, dark=${onDark.toFixed(2)}); need ≥ ${AA_NORMAL}:1`,
    );
  }
});

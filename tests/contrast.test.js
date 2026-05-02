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

const theme = getTheme("samsung-kr");
const c = theme.colors;

// Each row: [fg, bg, level, label]
const COMBINATIONS = [
  // Body copy on light surfaces — AA normal
  [c.text.primary,   c.surface.page,     AA_NORMAL, "text.primary on surface.page"],
  [c.text.primary,   c.surface.card,     AA_NORMAL, "text.primary on surface.card"],
  [c.text.primary,   c.surface.elevated, AA_NORMAL, "text.primary on surface.elevated"],
  [c.text.secondary, c.surface.page,     AA_NORMAL, "text.secondary on surface.page"],
  [c.text.secondary, c.surface.card,     AA_NORMAL, "text.secondary on surface.card"],
  [c.text.muted,     c.surface.page,     AA_NORMAL, "text.muted on surface.page"],
  [c.text.muted,     c.surface.card,     AA_NORMAL, "text.muted on surface.card"],

  // Inverse copy on dark surfaces — AA normal
  [c.text.onInverse,          c.surface.inverse, AA_NORMAL, "text.onInverse on surface.inverse"],
  [c.text.onInverseSecondary, c.surface.inverse, AA_NORMAL, "text.onInverseSecondary on surface.inverse"],

  // Brand text on brand backgrounds — AA normal
  [c.text.onBrand, c.brand.primary,   AA_NORMAL, "text.onBrand on brand.primary"],
  [c.text.onBrand, c.brand.secondary, AA_NORMAL, "text.onBrand on brand.secondary"],

  // Component-level — AA normal where the role is body/label, AA large for big CTAs.
  [theme.components.nav.color,    theme.components.nav.background,    AA_NORMAL, "nav color on nav background"],
  [theme.components.footer.color, theme.components.footer.background, AA_NORMAL, "footer color on footer background"],
];

for (const [fg, bg, level, label] of COMBINATIONS) {
  test(`contrast ${label} ≥ ${level}:1`, () => {
    const ratio = contrast(fg, bg);
    assert.ok(
      ratio >= level,
      `${label}: ${fg} on ${bg} → ${ratio.toFixed(2)}:1 (need ${level}:1)`,
    );
  });
}

// Brand-secondary (Samsung blue #1428A0) is too dark for white-on-blue large
// text? Actually it's plenty dark; just confirm the pin.
test("brand.secondary is dark enough for white text", () => {
  const ratio = contrast("#FFFFFF", c.brand.secondary);
  assert.ok(ratio >= 4.5, `brand.secondary contrast with white = ${ratio.toFixed(2)}:1`);
});

// brand.accent is a brighter blue meant for hover/active states — it MAY fail
// AA against white. Document the actual ratio so a future tightening notices.
test("brand.accent ratio against white is documented (may be < AA)", () => {
  const ratio = contrast("#FFFFFF", c.brand.accent);
  // We don't require AA here, just record the ratio. A future change that
  // pushes accent darker should re-check whether to require AA.
  assert.ok(ratio > 1, `brand.accent vs white = ${ratio.toFixed(2)}:1`);
});

// Semantic colors are background fills (badges, alerts, banners). The
// contract is that pairing the color with EITHER white text OR text.primary
// must clear AA normal — so a downstream component picks whichever works.
// This is intentionally weaker than "readable as foreground on white,"
// because most real-world uses are background-strength fills, not body text.
for (const [name, color] of Object.entries(c.semantic)) {
  test(`semantic.${name} pairs with white OR text.primary at AA normal`, () => {
    const onWhite = contrast(c.text.onBrand, color);
    const onDark  = contrast(c.text.primary, color);
    const best = Math.max(onWhite, onDark);
    assert.ok(
      best >= AA_NORMAL,
      `semantic.${name}: best pairing = ${best.toFixed(2)}:1 (white=${onWhite.toFixed(2)}, dark=${onDark.toFixed(2)}); need ≥ ${AA_NORMAL}:1`,
    );
  });
}

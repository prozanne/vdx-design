import { test } from "node:test";
import assert from "node:assert/strict";
import { themeToCss } from "../lib/token-to-css.js";

// A theme-shaped object whose `shadow.sm` value tries to break out of the
// `--vdx-shadow-sm: <value>;` declaration to inject extra CSS rules.
function buildMaliciousTheme(overrides = {}) {
  return {
    id: "evil",
    name: "Evil",
    version: "1.0.0",
    colors: {
      brand: { primary: "#000", primaryHover: "#000", secondary: "#000", accent: "#000" },
      neutral: { 0: "#fff", 50: "#fff", 100: "#fff", 200: "#fff", 300: "#fff", 500: "#fff", 700: "#fff", 900: "#fff", 1000: "#fff" },
      semantic: { success: "#000", warning: "#000", danger: "#000", info: "#000" },
      surface: { page: "#fff", card: "#fff", elevated: "#fff", inverse: "#000" },
      text: { primary: "#000", secondary: "#000", muted: "#000", onBrand: "#fff", onInverse: "#fff" },
      border: { subtle: "#000", default: "#000", strong: "#000", inverse: "#000" },
    },
    typography: {
      fontFamily: { sans: "sans-serif", display: "serif", mono: "monospace" },
      fontSize: { caption: "12px", bodyS: "14px", bodyM: "16px", bodyL: "18px", h4: "20px", h3: "24px", h2: "32px", h1: "40px", displayM: "48px", displayL: "64px", displayXL: "80px" },
      lineHeight: { tight: "1.1", normal: "1.5", relaxed: "1.7" },
      fontWeight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
      letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.04em" },
    },
    spacing: { 0: "0", 1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px", 8: "32px", 10: "40px", 12: "48px", 16: "64px", 20: "80px", 24: "96px" },
    radius: { none: "0", sm: "4px", md: "8px", lg: "16px", pill: "999px" },
    shadow: { none: "none", sm: "0 1px 2px rgba(0,0,0,0.06)", md: "0 4px 12px rgba(0,0,0,0.08)", lg: "0 12px 32px rgba(0,0,0,0.10)" },
    motion: { duration: { fast: "120ms", base: "240ms", slow: "400ms" }, easing: { standard: "ease-out", emphasized: "ease-in" } },
    breakpoints: { mobile: "360px", tablet: "768px", laptop: "1024px", desktop: "1440px", xl: "1920px" },
    components: {
      button: { height: "48px", paddingX: "32px", radius: "999px", fontWeight: "600" },
      input: { height: "48px", paddingX: "16px", radius: "4px", borderColor: "#000" },
      card: { padding: "24px", radius: "8px", shadow: "0 1px 2px rgba(0,0,0,0.06)" },
      nav: { height: "64px", background: "#000", color: "#fff" },
      footer: { background: "#000", color: "#fff" },
    },
    ...overrides,
  };
}

test("themeToCss rejects values containing a semicolon (CSS declaration break-out)", () => {
  const theme = buildMaliciousTheme();
  theme.shadow.sm = "red; } body { display: none; } /*";
  assert.throws(() => themeToCss(theme), /Unsafe token value/);
});

test("themeToCss rejects values containing a closing brace", () => {
  const theme = buildMaliciousTheme();
  theme.colors.brand.primary = "red } body { color: red";
  assert.throws(() => themeToCss(theme), /Unsafe token value/);
});

test("themeToCss rejects values containing an opening brace", () => {
  const theme = buildMaliciousTheme();
  theme.shadow.md = "0 1px 2px rgba(0,0,0,0.06) { evil";
  assert.throws(() => themeToCss(theme), /Unsafe token value/);
});

test("themeToCss rejects values containing a newline", () => {
  const theme = buildMaliciousTheme();
  theme.shadow.lg = "0 1px 2px rgba(0,0,0,0.06)\nbody { color: red; }";
  assert.throws(() => themeToCss(theme), /Unsafe token value/);
});

test("themeToCss rejects values containing angle brackets (style-tag break-out)", () => {
  const theme = buildMaliciousTheme();
  theme.colors.text.primary = "red</style><script>";
  assert.throws(() => themeToCss(theme), /Unsafe token value/);
});

test("themeToCss accepts normal token values", () => {
  const theme = buildMaliciousTheme();
  const css = themeToCss(theme);
  assert.match(css, /:root\s*{/);
  assert.match(css, /--vdx-colors-brand-primary: #000;/);
});

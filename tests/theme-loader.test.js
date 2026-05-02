import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadTheme, validateTheme } from "../lib/theme-loader.js";

function makeTempThemeDir(theme) {
  const dir = join(tmpdir(), `vdx-theme-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "theme.json"), JSON.stringify(theme, null, 2));
  return dir;
}

const minimalValid = {
  id: "test",
  name: "Test",
  version: "1.0.0",
  colors: {
    brand: { primary: "#000000", primaryHover: "#111111", secondary: "#222222", accent: "#333333" },
    neutral: { "0": "#FFFFFF", "50": "#FAFAFA", "100": "#F5F5F5", "200": "#EEEEEE", "300": "#DDDDDD", "500": "#767676", "700": "#3F3F3F", "900": "#1A1A1A", "1000": "#000000" },
    semantic: { success: "#00A96E", warning: "#F2A100", danger: "#E12832", info: "#1428A0" },
    surface: { page: "#FFFFFF", card: "#FFFFFF", elevated: "#FAFAFA", inverse: "#000000" },
    text: { primary: "#1A1A1A", secondary: "#3F3F3F", muted: "#767676", onBrand: "#FFFFFF", onInverse: "#FFFFFF", onInverseSecondary: "#CCCCCC" },
    border: { subtle: "#EEEEEE", default: "#DDDDDD", strong: "#1A1A1A", inverse: "#3F3F3F" },
  },
  typography: {
    fontFamily: { sans: "sans-serif", display: "serif", mono: "monospace" },
    fontSize: { caption: "12px", bodyS: "14px", bodyM: "16px", bodyL: "18px", h4: "20px", h3: "24px", h2: "32px", h1: "40px", displayM: "48px", displayL: "64px", displayXL: "80px" },
    lineHeight: { tight: "1.1", normal: "1.5", relaxed: "1.7" },
    fontWeight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
    letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.04em" },
  },
  spacing: { "0": "0", "1": "4px", "2": "8px", "3": "12px", "4": "16px", "5": "20px", "6": "24px", "8": "32px", "10": "40px", "12": "48px", "16": "64px", "20": "80px", "24": "96px" },
  radius: { none: "0", sm: "4px", md: "8px", lg: "16px", pill: "999px" },
  shadow: { none: "none", sm: "0 1px 2px rgba(0,0,0,0.06)", md: "0 4px 12px rgba(0,0,0,0.08)", lg: "0 12px 32px rgba(0,0,0,0.10)" },
  motion: { duration: { fast: "120ms", base: "240ms", slow: "400ms" }, easing: { standard: "ease-out", emphasized: "cubic-bezier(0.3, 0, 0, 1)" } },
  breakpoints: { mobile: "360px", tablet: "768px", laptop: "1024px", desktop: "1440px", xl: "1920px" },
  components: {
    button: { height: "48px", paddingX: "32px", radius: "999px", fontWeight: "600" },
    input: { height: "48px", paddingX: "16px", radius: "4px", borderColor: "#DDDDDD" },
    card: { padding: "24px", radius: "8px", shadow: "0 1px 2px rgba(0,0,0,0.06)" },
    nav: { height: "64px", background: "#000000", color: "#FFFFFF" },
    footer: { background: "#1A1A1A", color: "#DDDDDD" },
  },
};

test("validateTheme accepts a fully-formed theme", () => {
  const errors = validateTheme(minimalValid);
  assert.deepEqual(errors, []);
});

test("validateTheme rejects missing required token (typography.fontSize.bodyM)", () => {
  const broken = JSON.parse(JSON.stringify(minimalValid));
  delete broken.typography.fontSize.bodyM;
  const errors = validateTheme(broken);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /typography\.fontSize\.bodyM.*missing required field/);
});

test("validateTheme rejects bad color format", () => {
  const broken = JSON.parse(JSON.stringify(minimalValid));
  broken.colors.brand.primary = "not-a-color";
  const errors = validateTheme(broken);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /colors\.brand\.primary.*does not match pattern/);
});

test("validateTheme rejects bad version string", () => {
  const broken = JSON.parse(JSON.stringify(minimalValid));
  broken.version = "1.0";
  const errors = validateTheme(broken);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /version.*does not match pattern/);
});

test("validateTheme rejects unexpected top-level property", () => {
  const broken = JSON.parse(JSON.stringify(minimalValid));
  broken.somethingExtra = true;
  const errors = validateTheme(broken);
  assert.ok(errors.some(e => /somethingExtra.*unexpected property/.test(e)));
});

test("loadTheme reads and validates a directory", () => {
  const dir = makeTempThemeDir(minimalValid);
  try {
    const theme = loadTheme(dir);
    assert.equal(theme.id, "test");
    assert.equal(theme.name, "Test");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadTheme throws a useful error for invalid theme.json", () => {
  const broken = JSON.parse(JSON.stringify(minimalValid));
  delete broken.colors.brand.primary;
  const dir = makeTempThemeDir(broken);
  try {
    assert.throws(() => loadTheme(dir), /Invalid theme/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadTheme throws when theme.json is missing", () => {
  const dir = join(tmpdir(), `vdx-theme-missing-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  try {
    assert.throws(() => loadTheme(dir), /Failed to read theme/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

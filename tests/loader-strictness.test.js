import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadTheme } from "../lib/theme-loader.js";

// These tests pin down what the canonical schema accepts and rejects when
// applied via loadTheme. The validator's strict-mode behaviour ($ref siblings,
// unsupported types) is exercised separately in tests/validator-strictness.test.js
// using validateTheme(theme, customSchema).

test("loadTheme rejects a value that fails the length pattern", () => {
  const dir = mkdtempSync(join(tmpdir(), "vdx-bad-length-"));
  try {
    writeFileSync(join(dir, "theme.json"), JSON.stringify({
      id: "x",
      name: "X",
      version: "1.0.0",
      colors: {
        brand: { primary: "#000", primaryHover: "#000", secondary: "#000", accent: "#000" },
        neutral: { "0": "#FFF", "50": "#FFF", "100": "#FFF", "200": "#FFF", "300": "#FFF", "500": "#FFF", "700": "#FFF", "900": "#FFF", "1000": "#000" },
        semantic: { success: "#0F0", warning: "#FF0", danger: "#F00", info: "#00F" },
        surface: { page: "#FFF", card: "#FFF", elevated: "#FFF", inverse: "#000" },
        text: { primary: "#000", secondary: "#000", muted: "#000", onBrand: "#FFF", onInverse: "#FFF" },
        border: { subtle: "#FFF", default: "#FFF", strong: "#000", inverse: "#000" },
      },
      typography: {
        fontFamily: { sans: "sans-serif", display: "serif", mono: "monospace" },
        fontSize: { caption: "12px", bodyS: "14px", bodyM: "WAT" /* invalid */, bodyL: "18px", h4: "20px", h3: "24px", h2: "32px", h1: "40px", displayM: "48px", displayL: "64px", displayXL: "80px" },
        lineHeight: { tight: "1.1", normal: "1.5", relaxed: "1.7" },
        fontWeight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
        letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.04em" },
      },
      spacing: { "0": "0", "1": "4px", "2": "8px", "3": "12px", "4": "16px", "5": "20px", "6": "24px", "8": "32px", "10": "40px", "12": "48px", "16": "64px", "20": "80px", "24": "96px" },
      radius: { none: "0", sm: "4px", md: "8px", lg: "16px", pill: "999px" },
      shadow: { none: "none", sm: "x", md: "x", lg: "x" },
      motion: { duration: { fast: "100ms", base: "200ms", slow: "400ms" }, easing: { standard: "ease", emphasized: "ease-out" } },
      breakpoints: { mobile: "320px", tablet: "768px", laptop: "1024px", desktop: "1280px", xl: "1536px" },
      components: {
        button: { height: "48px", paddingX: "32px", radius: "999px", fontWeight: "600" },
        input: { height: "48px", paddingX: "16px", radius: "4px", borderColor: "#DDDDDD" },
        card: { padding: "24px", radius: "8px", shadow: "none" },
        nav: { height: "64px", background: "#000", color: "#FFF" },
        footer: { background: "#000", color: "#FFF" },
      },
    }, null, 2));
    assert.throws(() => loadTheme(dir), /typography\.fontSize\.bodyM.*does not match pattern/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadTheme rejects an invalid font weight", () => {
  const dir = mkdtempSync(join(tmpdir(), "vdx-bad-weight-"));
  try {
    const valid = JSON.parse(JSON.stringify({
      id: "x", name: "X", version: "1.0.0",
      colors: {
        brand: { primary: "#000", primaryHover: "#000", secondary: "#000", accent: "#000" },
        neutral: { "0": "#FFF", "50": "#FFF", "100": "#FFF", "200": "#FFF", "300": "#FFF", "500": "#FFF", "700": "#FFF", "900": "#FFF", "1000": "#000" },
        semantic: { success: "#0F0", warning: "#FF0", danger: "#F00", info: "#00F" },
        surface: { page: "#FFF", card: "#FFF", elevated: "#FFF", inverse: "#000" },
        text: { primary: "#000", secondary: "#000", muted: "#000", onBrand: "#FFF", onInverse: "#FFF" },
        border: { subtle: "#FFF", default: "#FFF", strong: "#000", inverse: "#000" },
      },
      typography: {
        fontFamily: { sans: "sans-serif", display: "serif", mono: "monospace" },
        fontSize: { caption: "12px", bodyS: "14px", bodyM: "16px", bodyL: "18px", h4: "20px", h3: "24px", h2: "32px", h1: "40px", displayM: "48px", displayL: "64px", displayXL: "80px" },
        lineHeight: { tight: "1.1", normal: "1.5", relaxed: "1.7" },
        fontWeight: { regular: "400", medium: "500", semibold: "600", bold: "999" /* invalid */ },
        letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.04em" },
      },
      spacing: { "0": "0", "1": "4px", "2": "8px", "3": "12px", "4": "16px", "5": "20px", "6": "24px", "8": "32px", "10": "40px", "12": "48px", "16": "64px", "20": "80px", "24": "96px" },
      radius: { none: "0", sm: "4px", md: "8px", lg: "16px", pill: "999px" },
      shadow: { none: "none", sm: "x", md: "x", lg: "x" },
      motion: { duration: { fast: "100ms", base: "200ms", slow: "400ms" }, easing: { standard: "ease", emphasized: "ease-out" } },
      breakpoints: { mobile: "320px", tablet: "768px", laptop: "1024px", desktop: "1280px", xl: "1536px" },
      components: {
        button: { height: "48px", paddingX: "32px", radius: "999px", fontWeight: "600" },
        input: { height: "48px", paddingX: "16px", radius: "4px", borderColor: "#DDDDDD" },
        card: { padding: "24px", radius: "8px", shadow: "none" },
        nav: { height: "64px", background: "#000", color: "#FFF" },
        footer: { background: "#000", color: "#FFF" },
      },
    }));
    writeFileSync(join(dir, "theme.json"), JSON.stringify(valid, null, 2));
    assert.throws(() => loadTheme(dir), /typography\.fontWeight\.bold.*does not match pattern/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadTheme accepts an optional defaultLang and rejects garbage", () => {
  const base = {
    id: "x", name: "X", version: "1.0.0",
    colors: {
      brand: { primary: "#000", primaryHover: "#000", secondary: "#000", accent: "#000" },
      neutral: { "0": "#FFF", "50": "#FFF", "100": "#FFF", "200": "#FFF", "300": "#FFF", "500": "#FFF", "700": "#FFF", "900": "#FFF", "1000": "#000" },
      semantic: { success: "#0F0", warning: "#FF0", danger: "#F00", info: "#00F" },
      surface: { page: "#FFF", card: "#FFF", elevated: "#FFF", inverse: "#000" },
      text: { primary: "#000", secondary: "#000", muted: "#000", onBrand: "#FFF", onInverse: "#FFF" },
      border: { subtle: "#FFF", default: "#FFF", strong: "#000", inverse: "#000" },
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
    shadow: { none: "none", sm: "x", md: "x", lg: "x" },
    motion: { duration: { fast: "100ms", base: "200ms", slow: "400ms" }, easing: { standard: "ease", emphasized: "ease-out" } },
    breakpoints: { mobile: "320px", tablet: "768px", laptop: "1024px", desktop: "1280px", xl: "1536px" },
    components: {
      button: { height: "48px", paddingX: "32px", radius: "999px", fontWeight: "600" },
      input: { height: "48px", paddingX: "16px", radius: "4px", borderColor: "#DDDDDD" },
      card: { padding: "24px", radius: "8px", shadow: "none" },
      nav: { height: "64px", background: "#000", color: "#FFF" },
      footer: { background: "#000", color: "#FFF" },
    },
  };

  const ok = mkdtempSync(join(tmpdir(), "vdx-lang-ok-"));
  try {
    writeFileSync(join(ok, "theme.json"), JSON.stringify({ ...base, defaultLang: "ko" }, null, 2));
    const t = loadTheme(ok);
    assert.equal(t.defaultLang, "ko");
  } finally {
    rmSync(ok, { recursive: true, force: true });
  }

  const bad = mkdtempSync(join(tmpdir(), "vdx-lang-bad-"));
  try {
    writeFileSync(join(bad, "theme.json"), JSON.stringify({ ...base, defaultLang: "K" }, null, 2));
    assert.throws(() => loadTheme(bad), /defaultLang.*does not match pattern/);
  } finally {
    rmSync(bad, { recursive: true, force: true });
  }
});

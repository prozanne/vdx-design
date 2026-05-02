import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getTheme } from "../lib/theme-registry.js";
import { themeToCss } from "../lib/token-to-css.js";

const THEME_DIR = resolve("themes/samsung-kr");

test("samsung-kr theme exists and validates", () => {
  const theme = getTheme("samsung-kr");
  assert.equal(theme.id, "samsung-kr");
});

test("samsung-kr theme keeps Samsung blue as the secondary brand color", () => {
  const theme = getTheme("samsung-kr");
  assert.equal(theme.colors.brand.secondary, "#1428A0");
});

test("samsung-kr primary CTA is black with pill radius", () => {
  const theme = getTheme("samsung-kr");
  assert.equal(theme.colors.brand.primary, "#000000");
  assert.equal(theme.components.button.radius, "999px");
});

test("samsung-kr typography stack lists SamsungOne first for body", () => {
  const theme = getTheme("samsung-kr");
  assert.match(theme.typography.fontFamily.sans, /^"SamsungOne"/);
  // Korean fallback present
  assert.match(theme.typography.fontFamily.sans, /Pretendard|Noto Sans KR|Apple SD Gothic Neo/);
});

test("samsung-kr exposes the full display scale", () => {
  const theme = getTheme("samsung-kr");
  assert.equal(theme.typography.fontSize.displayXL, "80px");
  assert.equal(theme.typography.fontSize.displayL, "64px");
  assert.equal(theme.typography.fontSize.displayM, "48px");
});

test("samsung-kr ships a tokens.css with every variable from theme.json", () => {
  const theme = getTheme("samsung-kr");
  const expectedCss = themeToCss(theme);
  const actualCss = readFileSync(`${THEME_DIR}/tokens.css`, "utf8");
  assert.equal(
    actualCss.trim(),
    expectedCss.trim(),
    "tokens.css is stale — run `npm run build:tokens`",
  );
});

test("samsung-kr ships a components.css that references CSS variables", () => {
  const css = readFileSync(`${THEME_DIR}/components.css`, "utf8");
  // Every var() reference should point at our --vdx- namespace.
  const varRefs = [...css.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map(m => m[1]);
  assert.ok(varRefs.length > 50, `expected many var() refs, got ${varRefs.length}`);
  for (const v of varRefs) {
    assert.match(v, /^--vdx-/, `non-namespaced variable: ${v}`);
  }
});

test("every var() reference in components.css resolves to a variable defined in tokens.css", () => {
  const components = readFileSync(`${THEME_DIR}/components.css`, "utf8");
  const tokens = readFileSync(`${THEME_DIR}/tokens.css`, "utf8");

  const referenced = new Set([...components.matchAll(/var\((--vdx-[a-zA-Z0-9-]+)/g)].map(m => m[1]));
  const defined = new Set([...tokens.matchAll(/(--vdx-[a-zA-Z0-9-]+):/g)].map(m => m[1]));

  const missing = [...referenced].filter(v => !defined.has(v));
  assert.deepEqual(missing, [], `components.css references undefined variables: ${missing.join(", ")}`);
});

test("samsung-kr theme directory ships the expected files", () => {
  for (const name of ["theme.json", "tokens.css", "components.css", "README.md"]) {
    assert.ok(existsSync(`${THEME_DIR}/${name}`), `missing ${name}`);
  }
  for (const ex of ["landing.html", "product-detail.html", "nav-footer.html"]) {
    assert.ok(existsSync(`${THEME_DIR}/examples/${ex}`), `missing examples/${ex}`);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, mkdirSync, mkdtempSync, cpSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { listThemes, getTheme } from "../lib/theme-registry.js";
import { loadTheme } from "../lib/theme-loader.js";
import { buildTokensCss, themeToCss } from "../lib/token-to-css.js";

const FIXTURE_DIR = resolve("tests/fixtures/test-theme");

// Each test that exercises the registry "drop in a new theme" workflow does so
// inside an OS tmpdir, NOT under the live `themes/` directory. Writing to the
// live tree races against `examples-render.test.js` (which iterates listThemes
// in parallel) and leaks half-built directories on crashes.
function makeIsolatedThemesDir() {
  return mkdtempSync(join(tmpdir(), "vdx-themes-"));
}

test("the fixture test-theme passes schema validation", () => {
  const theme = loadTheme(FIXTURE_DIR);
  assert.equal(theme.id, "test-theme");
  assert.equal(theme.name, "Test Theme");
});

test("the fixture test-theme uses different brand colors than samsung-kr", () => {
  const fixture = loadTheme(FIXTURE_DIR);
  const samsung = getTheme("samsung-kr");
  assert.notEqual(fixture.colors.brand.primary, samsung.colors.brand.primary);
});

test("token-to-css produces deterministic output for the fixture", () => {
  const theme = loadTheme(FIXTURE_DIR);
  const css = themeToCss(theme);
  assert.match(css, /:root\s*{/);
  assert.match(css, /--vdx-colors-brand-primary: #7C3AED;/);
  assert.match(css, /--vdx-typography-font-size-body-m: 15px;/);
});

test("a brand-new theme dropped into a themes dir is auto-registered", () => {
  const themesDir = makeIsolatedThemesDir();
  const id = "dropin-theme";
  const dir = join(themesDir, id);
  try {
    mkdirSync(dir, { recursive: true });
    cpSync(`${FIXTURE_DIR}/theme.json`, join(dir, "theme.json"));
    const json = JSON.parse(readFileSync(join(dir, "theme.json"), "utf8"));
    json.id = id;
    writeFileSync(join(dir, "theme.json"), JSON.stringify(json, null, 2));

    const ids = listThemes(themesDir);
    assert.deepEqual(ids, [id]);

    const theme = getTheme(id, themesDir);
    assert.equal(theme.id, id);

    const out = buildTokensCss(dir);
    assert.ok(existsSync(out));
  } finally {
    rmSync(themesDir, { recursive: true, force: true });
  }
});

test("a theme with mismatched id vs directory is rejected", () => {
  const themesDir = makeIsolatedThemesDir();
  const id = "mismatch-theme";
  const dir = join(themesDir, id);
  try {
    mkdirSync(dir, { recursive: true });
    cpSync(`${FIXTURE_DIR}/theme.json`, join(dir, "theme.json"));
    assert.throws(() => getTheme(id, themesDir), /mismatched id/);
  } finally {
    rmSync(themesDir, { recursive: true, force: true });
  }
});

test("getTheme rejects an id with path-traversal characters", () => {
  for (const bad of ["../etc", "samsung-kr/../..", "/etc/passwd", "a..b", "Samsung-KR", ""]) {
    assert.throws(
      () => getTheme(bad),
      /Invalid theme id/,
      `expected '${bad}' to be rejected`,
    );
  }
});

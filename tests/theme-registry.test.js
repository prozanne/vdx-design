import { test } from "node:test";
import assert from "node:assert/strict";
import { listThemes, getTheme } from "../lib/theme-registry.js";

test("listThemes returns the bundled themes", () => {
  const ids = listThemes();
  assert.ok(Array.isArray(ids));
  assert.ok(ids.includes("samsung-kr"), `expected samsung-kr in ${JSON.stringify(ids)}`);
});

test("getTheme('samsung-kr') returns a parsed theme object", () => {
  const theme = getTheme("samsung-kr");
  assert.equal(theme.id, "samsung-kr");
  assert.equal(theme.name, "Samsung Korea");
  assert.match(theme.version, /^\d+\.\d+\.\d+$/);
  assert.ok(theme.dir.endsWith("themes/samsung-kr"), `unexpected dir ${theme.dir}`);
});

test("getTheme on unknown id throws with available themes listed", () => {
  try {
    getTheme("not-a-theme");
    assert.fail("expected getTheme to throw");
  } catch (e) {
    assert.match(e.message, /Unknown theme 'not-a-theme'/);
    assert.match(e.message, /samsung-kr/);
  }
});

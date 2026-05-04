import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scopeCss, exportThemeForAgentx } from "../lib/export-for-agentx.js";

const SCOPE = '[data-vdx-theme="t"]';

test("scopeCss: :root becomes the scope itself", () => {
  const out = scopeCss(":root { --x: 1; }", SCOPE);
  assert.match(out, /\[data-vdx-theme="t"\]\s*{\s*--x:\s*1;\s*}/);
});

test("scopeCss: body alone becomes the scope itself", () => {
  const out = scopeCss("body { margin: 0; }", SCOPE);
  assert.match(out, /\[data-vdx-theme="t"\]\s*{\s*margin:\s*0;\s*}/);
  // Must NOT produce a literal `body` selector that would target the host page.
  assert.ok(!/(^|\s)body\s*{/.test(out), `unexpected body selector: ${out}`);
});

test("scopeCss: bare html selector is dropped", () => {
  const out = scopeCss("html { font: x; } body { margin: 0; }", SCOPE);
  assert.ok(!/html\s*{/.test(out), `unexpected html rule survived: ${out}`);
  assert.match(out, /\[data-vdx-theme="t"\]\s*{\s*margin:\s*0;\s*}/);
});

test("scopeCss: universal selector and pseudo-elements scoped", () => {
  const out = scopeCss("*, *::before, *::after { box-sizing: border-box; }", SCOPE);
  assert.match(out, /\[data-vdx-theme="t"\]\s+\*/);
  assert.match(out, /\[data-vdx-theme="t"\]\s+\*::before/);
  assert.match(out, /\[data-vdx-theme="t"\]\s+\*::after/);
});

test("scopeCss: class and tag selectors prefixed", () => {
  const out = scopeCss(".btn { color: red; } a { text-decoration: none; }", SCOPE);
  assert.match(out, /\[data-vdx-theme="t"\]\s+\.btn\s*{/);
  assert.match(out, /\[data-vdx-theme="t"\]\s+a\s*{/);
});

test("scopeCss: @media body recurses, prelude unchanged", () => {
  const out = scopeCss("@media (max-width: 768px) { .grid { display: block; } }", SCOPE);
  assert.match(out, /@media \(max-width: 768px\)\s*{/);
  assert.match(out, /\[data-vdx-theme="t"\]\s+\.grid\s*{/);
});

test("scopeCss: comma-separated selector list with bracket attrs preserved", () => {
  // Comma inside [foo="a,b"] must NOT split the list.
  const out = scopeCss('.btn:focus, [role="button"]:focus { outline: 1px; }', SCOPE);
  // Both selectors should be scoped exactly once.
  const matches = out.match(/\[data-vdx-theme="t"\]\s+/g) || [];
  assert.equal(matches.length, 2, `expected 2 scoped selectors, got: ${out}`);
  assert.match(out, /\[data-vdx-theme="t"\]\s+\[role="button"\]:focus/);
});

test("scopeCss: comments preserved", () => {
  const out = scopeCss("/* keep me */\n.x { color: red; }", SCOPE);
  assert.match(out, /\/\* keep me \*\//);
});

test("scopeCss: at-rule statement (no block) passes through", () => {
  const out = scopeCss('@charset "utf-8";\n.x { color: red; }', SCOPE);
  assert.match(out, /@charset "utf-8";/);
  assert.match(out, /\[data-vdx-theme="t"\]\s+\.x/);
});

test("scopeCss: body with descendant is rewritten without 'body' prefix", () => {
  const out = scopeCss("body .footer a { color: red; }", SCOPE);
  // The space after the scope (replacing 'body') should leave a single space.
  assert.match(out, /\[data-vdx-theme="t"\]\s+\.footer\s+a\s*{/);
  assert.ok(!/body\s/.test(out), `unexpected body retained: ${out}`);
});

test("exportThemeForAgentx: writes scoped tokens.css and components.css plus starter index.html", () => {
  const targetDir = mkdtempSync(join(tmpdir(), "vdx-export-"));
  try {
    const result = exportThemeForAgentx({ themeId: "samsung-kr", targetDir });
    const tokens = readFileSync(result.tokensOut, "utf8");
    const components = readFileSync(result.componentsOut, "utf8");
    const index = readFileSync(result.indexOut, "utf8");

    assert.match(tokens, /\[data-vdx-theme="samsung-kr"\]\s*{/);
    assert.ok(!/(^|\n):root\s*{/.test(tokens), "tokens.css still has :root");

    assert.match(components, /\[data-vdx-theme="samsung-kr"\]\s+\.btn\s*{/);
    assert.ok(!/^body\s*{/m.test(components), "components.css still has bare body rule");

    assert.match(index, /^<section data-vdx-theme="samsung-kr">/);
    assert.match(index, /<\/section>\s*$/);
    assert.ok(!/<!DOCTYPE/i.test(index), "starter fragment must not contain DOCTYPE");
    assert.ok(!/<html/i.test(index), "starter fragment must not contain <html>");
    assert.ok(!/<script/i.test(index), "starter fragment must not contain <script>");
  } finally {
    rmSync(targetDir, { recursive: true, force: true });
  }
});

test("exportThemeForAgentx: does not overwrite existing index.html unless force", () => {
  const targetDir = mkdtempSync(join(tmpdir(), "vdx-export-"));
  try {
    // First export creates the starter.
    exportThemeForAgentx({ themeId: "samsung-kr", targetDir });
    const original = readFileSync(join(targetDir, "index.html"), "utf8");

    // Simulate user edits.
    const userEdited = original + "\n<!-- user edit -->";
    const indexPath = join(targetDir, "index.html");
    writeFileSync(indexPath, userEdited);

    // Re-export without --force: index.html must be untouched.
    const result = exportThemeForAgentx({ themeId: "samsung-kr", targetDir });
    assert.equal(result.wroteIndex, false);
    assert.equal(readFileSync(indexPath, "utf8"), userEdited);

    // With --force, it gets overwritten.
    const forced = exportThemeForAgentx({ themeId: "samsung-kr", targetDir, force: true });
    assert.equal(forced.wroteIndex, true);
    assert.notEqual(readFileSync(indexPath, "utf8"), userEdited);
  } finally {
    rmSync(targetDir, { recursive: true, force: true });
  }
});

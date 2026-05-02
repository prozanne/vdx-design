import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { listThemes } from "../lib/theme-registry.js";

const THEMES_DIR = resolve("themes");

function* allExamples() {
  for (const id of listThemes()) {
    const exDir = join(THEMES_DIR, id, "examples");
    if (!existsSync(exDir) || !statSync(exDir).isDirectory()) continue;
    for (const f of readdirSync(exDir)) {
      if (f.endsWith(".html")) yield join(exDir, f);
    }
  }
}

test("at least one example HTML file exists across registered themes", () => {
  const examples = [...allExamples()];
  assert.ok(examples.length > 0, "no examples found");
});

test("every example imports tokens.css and components.css", () => {
  for (const ex of allExamples()) {
    const html = readFileSync(ex, "utf8");
    assert.match(html, /tokens\.css/, `${ex} does not import tokens.css`);
    assert.match(html, /components\.css/, `${ex} does not import components.css`);
  }
});

test("every example resolves its <link rel=stylesheet> hrefs to existing files", () => {
  for (const ex of allExamples()) {
    const html = readFileSync(ex, "utf8");
    const hrefs = [...html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)].map(m => m[1]);
    for (const href of hrefs) {
      if (href.startsWith("http")) continue; // external CDN refs are out of our control
      const resolved = resolve(dirname(ex), href);
      assert.ok(existsSync(resolved), `${ex} references missing stylesheet ${href}`);
    }
  }
});

test("example HTML has matched open/close tags (rough parse)", () => {
  const VOID = new Set([
    "area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr",
  ]);
  for (const ex of allExamples()) {
    const html = readFileSync(ex, "utf8");
    const stack = [];
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?>/g;
    let m;
    while ((m = tagRe.exec(html)) !== null) {
      const full = m[0];
      const name = m[1].toLowerCase();
      if (VOID.has(name) || full.endsWith("/>")) continue;
      if (full.startsWith("</")) {
        const top = stack.pop();
        assert.equal(top, name, `${ex}: closing </${name}> doesn't match open <${top || "(none)"}>`);
      } else {
        stack.push(name);
      }
    }
    assert.deepEqual(stack, [], `${ex}: unclosed tags ${stack.join(", ")}`);
  }
});

test("example HTML contains no literal hex colors or px/rem/em sizes in <body> markup (use tokens)", () => {
  // Allow hex colors and length values in inline <style> and <script>; check
  // body text only. Inline style="..." attributes must reference tokens via
  // var(--vdx-...) — anything else means the example is hard-coding a value
  // that the theme is supposed to control.
  for (const ex of allExamples()) {
    let html = readFileSync(ex, "utf8");
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    const violations = [];
    const styleAttrRe = /\bstyle\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = styleAttrRe.exec(html)) !== null) {
      const val = m[1];
      // Strip every var(--vdx-...) replacement so we only see "extra" content.
      const stripped = val.replace(/var\(--vdx-[a-zA-Z0-9-]+\)/g, "");
      if (/#[0-9A-Fa-f]{3,8}\b/.test(stripped)) {
        violations.push(`hex: ${val}`);
      }
      // Flag literal length units after stripping token references. Allow
      // unitless 0 and percentages (which can't be theme-tokenized usefully)
      // but reject anything like 16px / 1rem / 0.5em.
      if (/\b\d+(?:\.\d+)?(?:px|rem|em)\b/.test(stripped)) {
        violations.push(`length: ${val}`);
      }
    }
    assert.deepEqual(
      violations,
      [],
      `${ex}: inline styles use hardcoded values instead of tokens: ${violations.join(" | ")}`,
    );
  }
});

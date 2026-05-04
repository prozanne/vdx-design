// Validates that every file under themes/<id>/fragments/ obeys the AgentX
// fragment contract (single <section data-vdx-theme="...">, no document
// wrappers, no <script>, no inline event handlers). These files are reference
// compositions for the skill — they MUST mirror what services actually load.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { listThemes } from "../lib/theme-registry.js";

const THEMES_DIR = resolve("themes");

function* allFragments() {
  for (const id of listThemes()) {
    const dir = join(THEMES_DIR, id, "fragments");
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".html")) yield { id, path: join(dir, f) };
    }
  }
}

test("every fragments/*.html starts with <section data-vdx-theme=\"<id>\"> and ends with </section>", () => {
  for (const { id, path } of allFragments()) {
    const html = readFileSync(path, "utf8").trim();
    const opener = new RegExp(`^<section\\b[^>]*\\bdata-vdx-theme="${id}"`);
    assert.match(html, opener, `${path} must open with <section data-vdx-theme="${id}">`);
    assert.ok(html.endsWith("</section>"), `${path} must end with </section>`);
  }
});

test("fragments contain no document wrappers or scripts", () => {
  const banned = [
    [/<!doctype/i, "DOCTYPE"],
    [/<html\b/i, "<html>"],
    [/<head\b/i, "<head>"],
    [/<body\b/i, "<body>"],
    [/<script\b/i, "<script>"],
  ];
  for (const { path } of allFragments()) {
    const html = readFileSync(path, "utf8");
    for (const [re, name] of banned) {
      assert.ok(!re.test(html), `${path} must not contain ${name}`);
    }
  }
});

test("fragments use no inline event-handler attributes", () => {
  // on* handlers are banned because the AgentX runtime owns event delegation
  // via data-action / data-tool. Only allow `data-...` (lower-cased) attributes.
  const onAttr = /\son[a-z]+\s*=/i;
  for (const { path } of allFragments()) {
    const html = readFileSync(path, "utf8");
    assert.ok(!onAttr.test(html), `${path} contains an inline event handler (on*=) — use data-action instead`);
  }
});

test("fragments only reference relative theme stylesheets", () => {
  for (const { path } of allFragments()) {
    const html = readFileSync(path, "utf8");
    const hrefs = [...html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)].map(m => m[1]);
    assert.ok(hrefs.length > 0, `${path} must <link> tokens.css and components.css`);
    for (const href of hrefs) {
      assert.ok(
        !/^https?:/i.test(href),
        `${path} references external stylesheet ${href} — fragments must self-host theme CSS`,
      );
    }
  }
});

test("every action button has data-action and data-tool attributes", () => {
  // Match every <button ...> tag and check that, if it has data-action, it
  // also has data-tool (and vice versa). We don't require ALL buttons to be
  // tool calls — type=reset / type=submit-without-action are legal — but a
  // button with only data-action and no data-tool is a runtime no-op.
  const btnRe = /<button\b[^>]*>/gi;
  for (const { path } of allFragments()) {
    const html = readFileSync(path, "utf8");
    let m;
    while ((m = btnRe.exec(html)) !== null) {
      const tag = m[0];
      const hasAction = /\bdata-action\s*=/.test(tag);
      const hasTool = /\bdata-tool\s*=/.test(tag);
      assert.equal(
        hasAction,
        hasTool,
        `${path} button has data-action without data-tool (or vice versa): ${tag}`,
      );
    }
  }
});

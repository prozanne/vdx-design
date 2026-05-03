// End-to-end tests for lib/bundle.js. Each test scaffolds a tiny site in a
// fresh temp directory, runs `bundleSite`, and asserts on the produced
// view/index.html.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundleSite, assertSrcInside } from "../lib/bundle.js";

function makeSite(files) {
  const root = mkdtempSync(join(tmpdir(), "vdx-bundle-"));
  mkdirSync(join(root, "src"), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, "src", rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

test("bundleSite inlines a local stylesheet into a <style> block", () => {
  const root = makeSite({
    "index.html": `<!DOCTYPE html><html><head><link rel="stylesheet" href="./style.css"></head><body></body></html>`,
    "style.css": `:root { --x: 1px; }`,
  });
  try {
    const out = bundleSite(root);
    const html = readFileSync(out, "utf8");
    assert.ok(html.includes("<style>"), "expected an inlined <style> block");
    assert.ok(html.includes("--x: 1px"), "expected the CSS contents to land in the bundle");
    assert.ok(!html.includes(`href="./style.css"`), "the original <link> should be replaced");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundleSite leaves external https stylesheets alone", () => {
  const root = makeSite({
    "index.html": `<!DOCTYPE html><html><head><link rel="stylesheet" href="https://cdn.example.com/x.css"></head></html>`,
  });
  try {
    const out = bundleSite(root);
    const html = readFileSync(out, "utf8");
    assert.ok(html.includes(`href="https://cdn.example.com/x.css"`), "external href must survive bundling");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundleSite inlines a local script and preserves type=module", () => {
  const root = makeSite({
    "index.html": `<!DOCTYPE html><html><head><script type="module" src="./script.js" defer></script></head></html>`,
    "script.js": `console.log("hi");`,
  });
  try {
    const out = bundleSite(root);
    const html = readFileSync(out, "utf8");
    assert.match(html, /<script type="module">[\s\S]*console\.log\("hi"\);[\s\S]*<\/script>/);
    assert.ok(!html.includes(`src="./script.js"`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundleSite leaves external <script src> alone", () => {
  const root = makeSite({
    "index.html": `<!DOCTYPE html><html><head><script src="https://cdn.example.com/lib.js"></script></head></html>`,
  });
  try {
    const out = bundleSite(root);
    const html = readFileSync(out, "utf8");
    assert.ok(html.includes(`src="https://cdn.example.com/lib.js"`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundleSite converts a local <img src> into a data URI", () => {
  // 1x1 transparent PNG.
  const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";
  const root = makeSite({
    "index.html": `<!DOCTYPE html><html><body><img src="./pixel.png" alt=""></body></html>`,
    "pixel.png": Buffer.from(PNG_B64, "base64"),
  });
  try {
    const out = bundleSite(root);
    const html = readFileSync(out, "utf8");
    assert.match(html, /<img src="data:image\/png;base64,[A-Za-z0-9+/=]+" alt="">/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundleSite resolves CSS url() relative to the stylesheet's own directory", () => {
  // The CSS lives in src/css/, the asset in src/assets/. The url() in the
  // CSS uses ../assets/dot.svg, which is relative to the CSS file. The
  // bundler must resolve from the CSS dir, not the HTML dir, otherwise the
  // path resolves wrong and the inline fails.
  const root = makeSite({
    "index.html": `<!DOCTYPE html><html><head><link rel="stylesheet" href="./css/style.css"></head></html>`,
    "css/style.css": `body { background: url('../assets/dot.svg'); }`,
    "assets/dot.svg": `<svg xmlns="http://www.w3.org/2000/svg"/>`,
  });
  try {
    const out = bundleSite(root);
    const html = readFileSync(out, "utf8");
    assert.ok(html.includes("data:image/svg+xml;utf8,"), "SVG url() must become a data URI relative to the CSS dir");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundleSite leaves a tag alone when the referenced local file is missing", () => {
  const root = makeSite({
    "index.html": `<!DOCTYPE html><html><head><link rel="stylesheet" href="./missing.css"></head></html>`,
  });
  try {
    const out = bundleSite(root);
    const html = readFileSync(out, "utf8");
    assert.ok(html.includes(`href="./missing.css"`), "missing file must leave the original tag intact");
    assert.ok(!html.includes("<style>"), "no <style> block should be emitted for a missing file");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundleSite throws when src/index.html is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "vdx-bundle-"));
  try {
    assert.throws(() => bundleSite(root), /run scaffold first/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("assertSrcInside rejects a path outside the target root", () => {
  // The check is what stops a malicious caller from pointing the bundler at
  // /etc/passwd or similar by routing the path through the relative
  // resolution. The src must end up inside the resolved target.
  assert.throws(
    () => assertSrcInside("/etc/passwd", "/tmp/sandbox"),
    /must live inside/,
  );
});

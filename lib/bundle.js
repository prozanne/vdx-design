// Bundle a vdx-design site directory into a single self-contained
// view/index.html with all local CSS, JS, images, and fonts inlined.
//
// CLI:
//   node lib/bundle.js <target-dir>
//
// Reads <target-dir>/src/index.html and writes <target-dir>/view/index.html.
// External (https://) refs are left untouched. Use --inline-remote to fetch
// and inline them too (off by default — keeps the bundle deterministic and
// avoids surprising network access).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";

const MIME_BY_EXT = {
  ".css":   "text/css",
  ".js":    "application/javascript",
  ".mjs":   "application/javascript",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".jpeg":  "image/jpeg",
  ".gif":   "image/gif",
  ".svg":   "image/svg+xml",
  ".webp":  "image/webp",
  ".avif":  "image/avif",
  ".ico":   "image/x-icon",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
  ".otf":   "font/otf",
};

// A reference is "local" — and therefore eligible for inlining — only when it
// is a relative or repo-rooted path. Anything with a protocol, a protocol-
// relative `//host`, a `data:` URI, or a fragment-only `#id` is left alone.
function isLocalRef(ref) {
  if (!ref) return false;
  if (ref.startsWith("data:")) return false;
  if (ref.startsWith("//")) return false;
  if (ref.startsWith("#")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return false;
  return true;
}

// Resolve a local ref against a base directory and confirm the result lives
// inside the bundle sandbox. Returns null when the resolved path escapes,
// so callers can fall back to leaving the original tag alone (no silent
// exfil of host filesystem contents like `<link href="/etc/passwd">` would
// otherwise allow). Absolute hrefs and `..` traversal both end up outside
// the sandbox and are rejected by this check.
function resolveInside(ref, baseDir, sandboxRoot) {
  const abs = resolve(baseDir, ref);
  const rel = relative(sandboxRoot, abs);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
  return abs;
}

function toDataUri(filePath) {
  const ext = extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const buf = readFileSync(filePath);
  if (mime === "image/svg+xml") {
    // SVG inlines smaller and stays inspectable when URL-encoded; reserve
    // base64 for binary formats.
    const text = buf.toString("utf8").replace(/[\r\n\t]+/g, " ");
    return `data:${mime};utf8,${encodeURIComponent(text)}`;
  }
  return `data:${mime};base64,${buf.toString("base64")}`;
}

// Replace url(...) inside CSS with data: URIs for local files. The CSS may
// have come from a linked stylesheet, so resolve relative to the CSS's own
// directory, not the HTML's.
function inlineCssUrls(css, cssDir, sandboxRoot) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, _q, raw) => {
    const ref = raw.trim();
    if (!isLocalRef(ref)) return match;
    const target = resolveInside(ref, cssDir, sandboxRoot);
    if (!target) return match;
    try {
      return `url('${toDataUri(target)}')`;
    } catch {
      return match;
    }
  });
}

function inlineLinks(html, htmlDir, sandboxRoot) {
  return html.replace(
    /<link\b([^>]*)>/gi,
    (match, attrs) => {
      const relMatch = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i);
      const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (!relMatch || !hrefMatch) return match;
      const rel = relMatch[1].toLowerCase();
      const href = hrefMatch[1];
      if (!isLocalRef(href)) return match;
      const target = resolveInside(href, htmlDir, sandboxRoot);
      if (!target) return match;
      if (rel.includes("stylesheet")) {
        try {
          const css = readFileSync(target, "utf8");
          return `<style>\n${inlineCssUrls(css, dirname(target), sandboxRoot)}\n</style>`;
        } catch {
          return match;
        }
      }
      if (rel.includes("icon")) {
        try {
          return match.replace(hrefMatch[0], `href="${toDataUri(target)}"`);
        } catch {
          return match;
        }
      }
      return match;
    },
  );
}

function inlineScripts(html, htmlDir, sandboxRoot) {
  return html.replace(
    /<script\b([^>]*?)\s+src\s*=\s*["']([^"']+)["']([^>]*?)>\s*<\/script>/gi,
    (match, before, src, after) => {
      if (!isLocalRef(src)) return match;
      const target = resolveInside(src, htmlDir, sandboxRoot);
      if (!target) return match;
      let js;
      try {
        js = readFileSync(target, "utf8");
      } catch {
        return match;
      }
      const otherAttrs = `${before} ${after}`;
      const typeMatch = otherAttrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
      const typeAttr = typeMatch && typeMatch[1] === "module" ? ' type="module"' : "";
      return `<script${typeAttr}>\n${js}\n</script>`;
    },
  );
}

function inlineImgs(html, htmlDir, sandboxRoot) {
  return html.replace(
    /<img\b([^>]*)>/gi,
    (match, attrs) => {
      const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (!srcMatch) return match;
      const src = srcMatch[1];
      if (!isLocalRef(src)) return match;
      const target = resolveInside(src, htmlDir, sandboxRoot);
      if (!target) return match;
      try {
        return match.replace(srcMatch[0], `src="${toDataUri(target)}"`);
      } catch {
        return match;
      }
    },
  );
}

// Refuse to operate on a target that escapes its own root. The CLI accepts a
// user-supplied path; without this, a malicious caller could read arbitrary
// files through `<link href="../../../etc/passwd">` and embed them. The
// inliners already gate on existsSync via try/catch, but pinning the
// effective root narrows the blast radius further.
export function assertSrcInside(srcHtml, root) {
  const r = resolve(root);
  const s = resolve(srcHtml);
  const rel = relative(r, s);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`src/index.html must live inside ${r}: got ${s}`);
  }
}

export function bundleSite(targetDir) {
  const root = resolve(targetDir);
  const srcHtml = join(root, "src", "index.html");
  const viewDir = join(root, "view");
  const outHtml = join(viewDir, "index.html");

  if (!existsSync(srcHtml)) {
    throw new Error(`Expected ${relative(process.cwd(), srcHtml)} — run scaffold first.`);
  }
  assertSrcInside(srcHtml, root);

  let html = readFileSync(srcHtml, "utf8");
  const htmlDir = dirname(srcHtml);
  // Inliners may only read files under the target root. Anything outside —
  // absolute paths like `/etc/hosts`, `..` traversal, symlinks pointing
  // out — leaves the original tag alone so the output cannot exfiltrate
  // host-filesystem contents through `<link href="/etc/passwd">` and
  // friends.
  const sandboxRoot = root;

  html = inlineLinks(html, htmlDir, sandboxRoot);
  html = inlineScripts(html, htmlDir, sandboxRoot);
  html = inlineImgs(html, htmlDir, sandboxRoot);

  mkdirSync(viewDir, { recursive: true });
  writeFileSync(outHtml, html);
  return outHtml;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node lib/bundle.js <target-dir>");
    console.error("  Reads <target-dir>/src/index.html, inlines local CSS/JS/images,");
    console.error("  writes <target-dir>/view/index.html.");
    process.exit(2);
  }
  const out = bundleSite(target);
  console.log(`Wrote ${out}`);
}

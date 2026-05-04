// Exports a vdx-design theme into an AgentX service's view/ folder.
//
// AgentX dynamic UI fragments are inserted into the host page via innerHTML,
// which means a theme's CSS would leak into the host if its selectors are
// global (e.g. `body { ... }`, `.btn { ... }`, `* { ... }`). To make a theme
// safe for fragment use, every selector is rewritten so it only matches inside
// an opt-in root: `<section data-vdx-theme="<id>">`.
//
// CLI:
//   node lib/export-for-agentx.js --theme <id> --target <service-view-dir>
//   node lib/export-for-agentx.js --theme samsung-kr --target ../my-svc/view
//
// Result:
//   <target>/theme/tokens.css       (scoped)
//   <target>/theme/components.css   (scoped)
//   <target>/index.html             (only created if missing — starter fragment)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getTheme } from "./theme-registry.js";

// ---- Selector scoping --------------------------------------------------

// Split a selector list by top-level commas, ignoring commas inside () and [].
function splitSelectorList(list) {
  const out = [];
  let buf = "";
  let paren = 0;
  let bracket = 0;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket--;
    else if (ch === "," && paren === 0 && bracket === 0) {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = "";
      continue;
    }
    buf += ch;
  }
  const trimmed = buf.trim();
  if (trimmed) out.push(trimmed);
  return out;
}

// Rewrite a single selector so it only matches inside the scope.
//
//   :root           -> <scope>
//   html (alone)    -> dropped (host owns <html>)
//   body (alone)    -> <scope>
//   body.foo / body x -> <scope>.foo / <scope> x
//   anything else   -> <scope> <sel>
function scopeSelector(sel, scope) {
  if (sel === ":root") return scope;
  if (sel === "html") return null;
  if (sel === "body") return scope;
  if (/^html([\s.#:[]|$)/.test(sel)) return null;
  if (/^body([\s.#:[]|$)/.test(sel)) return scope + sel.slice(4);
  return `${scope} ${sel}`;
}

function scopeSelectorList(list, scope) {
  const scoped = splitSelectorList(list)
    .map(s => scopeSelector(s, scope))
    .filter(Boolean);
  return scoped.join(",\n");
}

// ---- CSS walker --------------------------------------------------------
//
// Walks a stylesheet block-by-block. For normal rules, scopes the selector
// list. For @media / @supports, recurses into the body. Other at-rules pass
// through verbatim. String literals and comments are honored so braces inside
// them don't confuse the parser.

const NESTED_AT_RULES = new Set(["media", "supports", "container"]);

export function scopeCss(css, scope) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    // Pass through whitespace.
    const wsStart = i;
    while (i < css.length && /\s/.test(css[i])) i++;
    out += css.slice(wsStart, i);
    if (i >= css.length) break;

    // Pass through block comments.
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) throw new Error("Unterminated CSS comment");
      out += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // Scan a prelude up to '{' (rule body) or ';' (at-rule statement).
    const preludeStart = i;
    let stopped = null; // "{" or ";"
    while (i < css.length) {
      const ch = css[i];
      if (ch === '"' || ch === "'") {
        const q = ch;
        i++;
        while (i < css.length && css[i] !== q) {
          if (css[i] === "\\") i++;
          i++;
        }
        i++;
      } else if (ch === "/" && css[i + 1] === "*") {
        const end = css.indexOf("*/", i + 2);
        if (end === -1) throw new Error("Unterminated CSS comment");
        i = end + 2;
      } else if (ch === "{") {
        stopped = "{";
        break;
      } else if (ch === ";") {
        stopped = ";";
        break;
      } else {
        i++;
      }
    }

    if (stopped === null) {
      out += css.slice(preludeStart, i);
      break;
    }

    if (stopped === ";") {
      out += css.slice(preludeStart, i + 1);
      i++;
      continue;
    }

    const prelude = css.slice(preludeStart, i).trim();
    i++; // consume '{'

    const bodyStart = i;
    let depth = 1;
    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (ch === '"' || ch === "'") {
        const q = ch;
        i++;
        while (i < css.length && css[i] !== q) {
          if (css[i] === "\\") i++;
          i++;
        }
        i++;
      } else if (ch === "/" && css[i + 1] === "*") {
        const end = css.indexOf("*/", i + 2);
        if (end === -1) throw new Error("Unterminated CSS comment");
        i = end + 2;
      } else if (ch === "{") {
        depth++;
        i++;
      } else if (ch === "}") {
        depth--;
        i++;
      } else {
        i++;
      }
    }
    const body = css.slice(bodyStart, i - 1);

    if (prelude.startsWith("@")) {
      const m = prelude.match(/^@(\S+)/);
      const atName = m ? m[1].toLowerCase() : "";
      if (NESTED_AT_RULES.has(atName)) {
        out += `${prelude} {${scopeCss(body, scope)}}`;
      } else {
        // @font-face, @keyframes, @page, @import, etc. — leave the body alone.
        out += `${prelude} {${body}}`;
      }
    } else {
      const scoped = scopeSelectorList(prelude, scope);
      if (!scoped) {
        // Every selector in this list dropped (e.g. an `html`-only rule).
        // Skip the rule entirely, but keep a placeholder for traceability.
        out += `/* dropped non-scopable rule: ${prelude.replace(/\*\//g, "*\\/")} */`;
      } else {
        out += `${scoped} {${body}}`;
      }
    }
  }
  return out;
}

// ---- Scoped CSS file emission ------------------------------------------

function buildScopedTokens(rawCss, scope, themeId) {
  const scoped = scopeCss(rawCss, scope);
  return [
    `/* Generated by lib/export-for-agentx.js — do not edit by hand. */`,
    `/* Source: themes/${themeId}/tokens.css, scoped to ${scope} */`,
    scoped.replace(/^\/\* Generated by [^*]+\*\/\n?/, "").replace(/^\/\* Theme: [^*]+\*\/\n?/, ""),
  ].join("\n");
}

function buildScopedComponents(rawCss, scope, themeId) {
  const scoped = scopeCss(rawCss, scope);
  // The original components.css has a `*, *::before, *::after { box-sizing }`
  // rule that we scoped to `[scope] *` — which doesn't include the scope root
  // itself. Add a one-liner so the root <section> participates in the reset.
  const preamble = [
    `/* Generated by lib/export-for-agentx.js — do not edit by hand. */`,
    `/* Source: themes/${themeId}/components.css, scoped to ${scope} */`,
    `${scope} { box-sizing: border-box; }`,
    "",
  ].join("\n");
  return preamble + scoped;
}

// ---- Starter index.html fragment ---------------------------------------

function starterFragment(themeId) {
  return `<section data-vdx-theme="${themeId}">
  <link rel="stylesheet" href="theme/tokens.css">
  <link rel="stylesheet" href="theme/components.css">

  <header class="stack">
    <p class="caption" data-bind="status_label">준비 중</p>
    <h1 class="display-m" data-bind="page_title">Service title</h1>
    <p class="body-l text-muted" data-bind="page_subtitle">한 줄 설명을 여기 둡니다.</p>
  </header>

  <div class="stack-lg" style="margin-top: var(--vdx-spacing-12);">
    <div class="card">
      <h3>현재 상태</h3>
      <div data-bind-html="status_panel">
        <!-- 서버가 채워주는 영역 -->
        <p class="text-muted">상태 정보를 불러오는 중…</p>
      </div>
    </div>

    <form class="card stack">
      <h3>실행</h3>
      <label class="label" for="primary-input">입력</label>
      <input class="input" id="primary-input" name="query" placeholder="요청 내용">
      <div class="row">
        <button class="btn btn-primary" data-action="tool_call" data-tool="SERVICE_ID.run">
          실행
        </button>
        <button class="btn btn-ghost" type="reset">초기화</button>
      </div>
      <p class="caption" data-bind="tool_feedback"></p>
    </form>
  </div>
</section>
`;
}

// ---- CLI ---------------------------------------------------------------

function parseArgs(argv) {
  const args = { theme: null, target: null, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--theme") args.theme = argv[++i];
    else if (a === "--target") args.target = argv[++i];
    else if (a === "--force") args.force = true;
    else if (a === "-h" || a === "--help") args.help = true;
  }
  return args;
}

function usage() {
  return [
    "Usage: node lib/export-for-agentx.js --theme <id> --target <view-dir> [--force]",
    "",
    "  --theme <id>       Theme id from themes/ (e.g. samsung-kr)",
    "  --target <dir>     Service's view/ directory. Will be created if missing.",
    "  --force            Overwrite an existing index.html in <target>.",
  ].join("\n");
}

export function exportThemeForAgentx({ themeId, targetDir, force = false }) {
  const theme = getTheme(themeId); // throws on unknown id
  const scope = `[data-vdx-theme="${themeId}"]`;

  const tokensSrc = readFileSync(join(theme.dir, "tokens.css"), "utf8");
  const componentsSrc = readFileSync(join(theme.dir, "components.css"), "utf8");

  const themeOut = join(targetDir, "theme");
  mkdirSync(themeOut, { recursive: true });

  const tokensOut = join(themeOut, "tokens.css");
  const componentsOut = join(themeOut, "components.css");
  writeFileSync(tokensOut, buildScopedTokens(tokensSrc, scope, themeId));
  writeFileSync(componentsOut, buildScopedComponents(componentsSrc, scope, themeId));

  const indexOut = join(targetDir, "index.html");
  let wroteIndex = false;
  if (force || !existsSync(indexOut)) {
    writeFileSync(indexOut, starterFragment(themeId));
    wroteIndex = true;
  }

  return { tokensOut, componentsOut, indexOut, wroteIndex, scope };
}

// pathToFileURL normalizes Windows drive letters and slashes; a raw
// `file://${argv[1]}` template would never match on Windows because
// process.argv[1] uses backslashes while import.meta.url uses forward slashes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.theme || !args.target) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }
  const result = exportThemeForAgentx({
    themeId: args.theme,
    targetDir: resolve(args.target),
    force: args.force,
  });
  console.log(`Wrote ${result.tokensOut}`);
  console.log(`Wrote ${result.componentsOut}`);
  if (result.wroteIndex) {
    console.log(`Wrote ${result.indexOut}`);
  } else {
    console.log(`Skipped ${result.indexOut} (already exists; pass --force to overwrite)`);
  }
  console.log(`Scope: ${result.scope}`);
}

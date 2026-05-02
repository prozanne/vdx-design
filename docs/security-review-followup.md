---
date: 2026-05-03
reviewer: security-review-follow-up
scope: scripts/static-server.js, lib/token-to-css.js (modified), themes/samsung-kr/playgrounds/*.html, themes/samsung-kr/examples/galaxy-s26.html, tests/{contrast,css-lint,responsive}.test.js, .claude/launch.json, .playwright-mcp/
prior-review: docs/critic-a11y-and-security.md
---

# VDX Design — Security Follow-up Review

Continuation of the prior `a11y-security-critic` review. The earlier scope
covered `lib/{theme-loader,theme-registry,token-to-css}.js` and the original
example pages. This pass covers files added or modified since.

Severity legend matches the prior doc:
**CRITICAL / HIGH / MEDIUM / LOW / INFO** — same definitions.

IDs continue from `SEC-15` to avoid collisions with the prior review's
`SEC-01..14`.

---

## Status of prior findings

Re-checked the items the prior review left actionable. None of them were fixed
in the current working tree:

| Prior ID | Status | Evidence |
|----------|--------|----------|
| SEC-02 (HIGH, arbitrary file write via CLI argv) | **NOT FIXED** | `lib/token-to-css.js:124-126` still passes `process.argv[2]` through `resolve()` and into `buildTokensCss`, which `writeFileSync`s to `join(themeDir, "tokens.css")` with no sandbox check. |
| SEC-03 (HIGH, `*/` comment-close injection in CSS) | **NOT FIXED** | `CSS_SAFE_VALUE = /^[^;{}<>\n\r]+$/` (line 27) unchanged. `theme.name` and `theme.version` interpolated raw into the comment header at line 103. |
| SEC-12 (INFO, brittle Windows CLI detection) | **NOT FIXED** | Line 122 still `import.meta.url === \`file://${process.argv[1]}\``. |
| The only diff to `lib/token-to-css.js` is a `camelToKebab(k)` on the group name (cosmetic). | — | `git diff HEAD -- lib/token-to-css.js` shows three added lines. |

**Recommendation:** before merging the working-tree changes, address SEC-02
and SEC-03 — they are HIGH and the current edits don't touch them.

---

## New findings

### SEC-15 — `scripts/static-server.js` path-traversal check is prefix-only (HIGH)

`scripts/static-server.js:53-58`:

```js
const safe = normalize(join(ROOT, path));
if (!safe.startsWith(ROOT)) {
  res.writeHead(403);
  res.end("forbidden");
  return;
}
```

`startsWith(ROOT)` is a string-prefix check. If `ROOT` is
`/Users/case/Documents/samsung/vdx-design`, a sibling directory named
`vdx-design-leak` will pass: `/Users/case/Documents/samsung/vdx-design-leak/x`
starts with the literal `ROOT` string. This is the classic
"prefix without separator" path-traversal bypass.

A second, separate problem on the same lines: even when the check works
correctly, `ROOT` is the **entire repo root** (`resolve(..., "../..")` from
`scripts/`), so a successful request can serve any file in the repo —
including `.git/`, `package.json`, `lib/`, `tests/`, `.claude/`,
`themes/*/theme.json`. For a dev-only static server this is not an
exploitable network risk (it binds to `127.0.0.1`), but it is a
defense-in-depth and information-disclosure concern: any browser tab on
the same machine can read `http://127.0.0.1:5757/.git/config` while the
server runs.

**Recommendations:**

1. Compare with a trailing separator: `safe === ROOT || safe.startsWith(ROOT + path.sep)`. Better: `path.relative(ROOT, safe)` and reject if it starts with `..` or is absolute.
2. Restrict the served root to `themes/` (the only directory the playgrounds and examples need), not the project root. Add an allowlist of subdirectories.

### SEC-16 — `/__choice` POST endpoint has no body size limit (MEDIUM)

`scripts/static-server.js:30-32`:

```js
let body = "";
req.on("data", (c) => (body += c));
```

The handler appends every chunk to a string with no cap and no Content-Length
check. A client sending an unbounded request body causes the Node process to
allocate until OOM or process limit. There is also no `Content-Type`
validation — any body content is fed to `JSON.parse`.

The endpoint is reachable from any localhost-origin page (no
`Access-Control-Allow-Origin`, but a same-origin or simple-CORS POST from
`http://127.0.0.1:*` works without preflight). For dev-only this is low
operational risk, but the pattern is wrong.

**Recommendations:**

1. Cap accumulation: if `body.length > 64 * 1024`, destroy the request and return 413.
2. Reject when `req.headers["content-type"]` is not `application/json`.
3. Consider a dev-mode CSRF token if this state is read by other pages.

### SEC-17 — `static-server.js` echoes raw error objects to clients (LOW)

`scripts/static-server.js:69-70`:

```js
res.writeHead(500);
res.end(String(err));
```

`String(err)` for a Node `Error` includes the message but `err.stack`
(a multi-line stack trace pointing at filesystem paths and line numbers)
appears when an upstream library throws non-stringy errors. For a localhost
dev server this is a small leak, but combined with SEC-15 it gives an
attacker who reaches the port a clean view of the project layout.

Also, the 500 response has no `Content-Type` header.

**Recommendation:** log the error server-side, return `res.end("internal error")` with a generic body and `Content-Type: text/plain; charset=utf-8`.

### SEC-18 — `decodeURIComponent` in request handler can throw uncaught (LOW)

`scripts/static-server.js:51`:

```js
let path = decodeURIComponent(url.pathname);
```

`decodeURIComponent` throws `URIError` on malformed escape sequences
(e.g., `%FF`, `%`). The handler is an async function; an uncaught throw before
the `try { … } catch` block (lines 59–72) becomes an unhandled rejection,
which terminates the process under Node's default behavior in newer versions.

**Recommendation:** wrap the decode in try/catch and 400 on failure, or move
the entire body of the handler into a single try/catch.

### SEC-19 — `static-server.js` MIME map allows nothing for `.map` / `.txt` / `.gif` (INFO)

Source-map files served as `application/octet-stream` will not be parsed by
DevTools. Not a security finding — flagged because it surfaces with the
allowlist tightening recommended in SEC-15 (an explicit allowlist + MIME map
should be expanded together).

### SEC-20 — `.playwright-mcp/` is committed (untracked) and should be gitignored (MEDIUM)

`git status` lists the directory as untracked:

```
?? .playwright-mcp/
```

The directory contains automation traces (`page-*.yml`, `console-*.log`)
captured during browser sessions. These traces typically include:

- The full DOM at each step (could include any page content the user navigated to during testing).
- Console logs (could include warnings, error messages, or third-party tracker output).
- Network request URLs and timings.

`.gitignore` does *not* list `.playwright-mcp/`. A future `git add -A` (or any
glob commit) will publish whatever is in there. Compare with the existing
gitignore entries for `.claude/launch.json` and `.claude/worktrees/` — the
same protection should extend here.

**Recommendation:** add `.playwright-mcp/` to `.gitignore`. If past traces
contain anything sensitive (e.g., a session-internal URL, an authenticated
page), purge them before the next commit.

### SEC-21 — Playground HTML files normalize `innerHTML = templateLiteral(state)` patterns (LOW)

Eight of the nine playground pages render content via:

```js
host.innerHTML = templateLiteral(stateOrFixedData);
```

Locations:
- `themes/samsung-kr/playgrounds/buttons.html:467`
- `themes/samsung-kr/playgrounds/colors.html:585` (static string, fine)
- `themes/samsung-kr/playgrounds/forms.html:1001`
- `themes/samsung-kr/playgrounds/grid.html:395`
- `themes/samsung-kr/playgrounds/hero.html:508`
- `themes/samsung-kr/playgrounds/product-card.html:364`
- `themes/samsung-kr/playgrounds/spacing.html:456` (assignment to `''`, fine)
- `themes/samsung-kr/playgrounds/typography.html:539+` (uses `textContent` via DOM, fine)

In the current files, every interpolation is fed by a hard-coded fixture
array (e.g., `products` in `product-card.html`) or a bounded enum (radio-
button values like `variant: "a"|"b"|"c"`). **There is no current XSS** —
no `URLSearchParams`, `location.hash`, `postMessage`, or `localStorage`
read appears in any of the new HTML.

The concern is the same one the prior review flagged in **XC-02 (Examples
are templates)**: SKILL.md tells consumers to skim these files for proven
compositions. A consumer copying this idiom and feeding it from a `fetch()`
result, a `URLSearchParams`, or a CMS field will ship XSS. Two of the eight
sites (`buttons.html:467` and `product-card.html:364`) construct HTML
strings from a *typed value* without an escape helper anywhere in the file
— so the example does not even *contain* the helper a consumer would need.

**Recommendations** (in order of preference):

1. Switch to `document.createElement` + `textContent` / `setAttribute` for the dynamic parts; reserve `innerHTML` for static structural shells.
2. Or, define a tiny `escapeHtml(s)` helper at the top of each playground and route every interpolation through it. Demonstrating the helper is the point.
3. At minimum, add a `<!-- All interpolated values are bounded enums; do not adapt this pattern for user-supplied data without escaping. -->` comment near each `innerHTML =` site.

### SEC-22 — `themes/samsung-kr/playgrounds/grid.html` has `onsubmit="return false"` inline handler (LOW)

`themes/samsung-kr/playgrounds/grid.html:251`:

```html
<form class="container-wide" id="pg-form" onsubmit="return false;">
```

Inline event handlers are incompatible with strict CSP (`script-src 'self'`)
and the prior review's PROJECT direction toward token-discipline. If the
team adds CSP later, this pattern will silently break. Also: a `<form>`
that exists only to suppress submission is a smell — use a `<div>` or call
`event.preventDefault()` from the script block.

**Recommendation:** remove the `onsubmit` attribute and add an event listener
in the existing `<script>` block.

### SEC-23 — `.claude/launch.json` correctly gitignored, contents benign (POSITIVE)

`.claude/launch.json` is listed in `.gitignore` (line: `.claude/launch.json`),
so it will not be committed. Contents are a non-sensitive dev-launch config
(node, port 5757). **No finding** — just confirmation.

### SEC-24 — New test files have no shell exec / network / ReDoS surface (POSITIVE)

Reviewed `tests/contrast.test.js`, `tests/css-lint.test.js`,
`tests/responsive.test.js`. None call `child_process`, none open sockets,
none accept external input. The two `new RegExp(...)` uses
(`tests/responsive.test.js:18` and `:62`) are constructed from internal test
fixtures or are properly escaped with
`replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`. **No finding.**

---

## Summary table

| ID      | Severity | Area     | Title                                                            |
|---------|----------|----------|------------------------------------------------------------------|
| SEC-15  | HIGH     | server   | Path-traversal check is prefix-only; entire repo served as root  |
| SEC-16  | MEDIUM   | server   | `/__choice` POST has no body size or Content-Type check          |
| SEC-17  | LOW      | server   | 500 handler echoes raw error including stack                     |
| SEC-18  | LOW      | server   | `decodeURIComponent` outside try/catch can crash the process     |
| SEC-19  | INFO     | server   | MIME allowlist incomplete                                        |
| SEC-20  | MEDIUM   | repo     | `.playwright-mcp/` not in `.gitignore`, traces may contain DOM   |
| SEC-21  | LOW      | examples | `innerHTML = template(state)` pattern propagates to consumers    |
| SEC-22  | LOW      | examples | Inline `onsubmit` in playground breaks future CSP                |
| SEC-23  | -        | repo     | `.claude/launch.json` gitignored correctly (positive)            |
| SEC-24  | -        | tests    | New tests have no shell/network/ReDoS surface (positive)         |

Carried over from the prior review and **still unfixed**:

| ID     | Severity | Title                                                  |
|--------|----------|--------------------------------------------------------|
| SEC-02 | HIGH     | `buildTokensCss` writes to arbitrary path from CLI argv |
| SEC-03 | HIGH     | `CSS_SAFE_VALUE` allows `/*` `*/` comment-close injection |
| SEC-12 | INFO     | CLI detection brittle on Windows                       |

---

## Recommended fix order

1. **SEC-15** (HIGH) — fix the prefix-only check before this server is exposed beyond the local machine for any reason. Trivial 1-line fix.
2. **SEC-02 / SEC-03** (HIGH, both carried from prior review) — these were known and the recent edits did not address them. Recommend a single follow-up commit.
3. **SEC-20** (MEDIUM) — add `.playwright-mcp/` to `.gitignore` before the next `git add`.
4. **SEC-16** (MEDIUM) — body cap on `/__choice`.
5. The LOW/INFO items can be batched.

---

VERDICT: The new code introduces one HIGH (SEC-15, server path-traversal
check) and one MEDIUM (SEC-20, untracked traces) that should be fixed
before pushing the working tree to a shared branch. The prior HIGHs in
`lib/token-to-css.js` (SEC-02, SEC-03) remain open and should be bundled
into the same fix-up commit.

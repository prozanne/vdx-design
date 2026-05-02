#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v !== undefined && !v.startsWith("--")) {
        args[k] = v;
        i++;
      } else {
        args[k] = true;
      }
    }
  }
  return args;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function buildVariantPage(variantHtml) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/tokens.css">
<link rel="stylesheet" href="/components.css">
<style>
  html, body { margin: 0; }
  body {
    padding: var(--vdx-spacing-4);
    background: var(--vdx-colors-surface-page);
    color: var(--vdx-colors-text-primary);
    font-family: var(--vdx-typography-font-family-base);
  }
</style>
</head>
<body>
${variantHtml}
</body>
</html>`;
}

function renderChooser({ question, topic }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>결정: ${escapeHtml(topic)}</title>
<link rel="stylesheet" href="/tokens.css">
<link rel="stylesheet" href="/components.css">
<style>
  body {
    margin: 0;
    padding: var(--vdx-spacing-6);
    font-family: var(--vdx-typography-font-family-base);
    background: var(--vdx-colors-surface-page);
    color: var(--vdx-colors-text-primary);
  }
  .header {
    text-align: center;
    margin-bottom: var(--vdx-spacing-6);
    max-width: var(--vdx-layout-content);
    margin-left: auto;
    margin-right: auto;
  }
  .header h1 {
    font-size: var(--vdx-typography-font-size-h2);
    font-weight: var(--vdx-typography-font-weight-bold);
    margin: 0 0 var(--vdx-spacing-2);
  }
  .header p {
    color: var(--vdx-colors-text-secondary);
    font-size: var(--vdx-typography-font-size-body-m);
    margin: 0;
  }
  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--vdx-spacing-4);
    max-width: var(--vdx-layout-wide);
    margin: 0 auto;
  }
  @media (max-width: 720px) {
    .compare { grid-template-columns: 1fr; }
  }
  .option {
    display: flex;
    flex-direction: column;
    background: var(--vdx-colors-surface-card);
    border: 1px solid var(--vdx-colors-border-default);
    border-radius: var(--vdx-radius-lg);
    overflow: hidden;
  }
  .option__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--vdx-spacing-3) var(--vdx-spacing-4);
    background: var(--vdx-colors-surface-elevated);
    border-bottom: 1px solid var(--vdx-colors-border-subtle);
  }
  .option__label h2 {
    font-size: var(--vdx-typography-font-size-h4);
    font-weight: var(--vdx-typography-font-weight-semibold);
    margin: 0;
  }
  .option__frame {
    width: 100%;
    height: 480px;
    border: 0;
    background: var(--vdx-colors-surface-page);
    display: block;
  }
  .option__pick {
    appearance: none;
    border: 0;
    background: var(--vdx-colors-brand-primary);
    color: var(--vdx-colors-text-on-inverse);
    font-size: var(--vdx-typography-font-size-body-l);
    font-weight: var(--vdx-typography-font-weight-medium);
    padding: var(--vdx-spacing-3) var(--vdx-spacing-6);
    cursor: pointer;
    transition: background-color var(--vdx-motion-duration-base) var(--vdx-motion-easing-base);
  }
  .option__pick:focus-visible {
    outline: 2px solid var(--vdx-colors-brand-accent);
    outline-offset: -4px;
  }
  .option__pick:disabled {
    background: var(--vdx-colors-neutral-300);
    cursor: not-allowed;
  }
  @media (hover: hover) {
    .option__pick:not(:disabled):hover {
      background: var(--vdx-colors-brand-primary-hover);
    }
  }
  .status {
    max-width: var(--vdx-layout-content);
    margin: var(--vdx-spacing-6) auto 0;
    text-align: center;
    padding: var(--vdx-spacing-4);
    border-radius: var(--vdx-radius-md);
    background: var(--vdx-colors-surface-elevated);
    color: var(--vdx-colors-text-secondary);
    font-size: var(--vdx-typography-font-size-body-m);
  }
  .status[data-state="chosen"] {
    background: var(--vdx-colors-semantic-success);
    color: var(--vdx-colors-text-on-inverse);
    font-weight: var(--vdx-typography-font-weight-semibold);
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
</style>
</head>
<body>
<header class="header">
  <h1>${escapeHtml(question)}</h1>
  <p>주제: <code>${escapeHtml(topic)}</code> · 두 디자인을 비교한 뒤 더 마음에 드는 쪽을 선택하세요.</p>
</header>
<main class="compare">
  <section class="option">
    <div class="option__label"><h2>A</h2></div>
    <iframe class="option__frame" src="/variants/a" title="변형 A" loading="eager"></iframe>
    <button class="option__pick" type="button" data-choice="A">이 디자인 선택 (A)</button>
  </section>
  <section class="option">
    <div class="option__label"><h2>B</h2></div>
    <iframe class="option__frame" src="/variants/b" title="변형 B" loading="eager"></iframe>
    <button class="option__pick" type="button" data-choice="B">이 디자인 선택 (B)</button>
  </section>
</main>
<p class="status" id="status">아직 선택되지 않았습니다 — A 또는 B를 클릭하세요.</p>
<script>
const status = document.getElementById('status');
document.querySelectorAll('.option__pick').forEach(btn => {
  btn.addEventListener('click', async () => {
    const choice = btn.dataset.choice;
    status.dataset.state = 'chosen';
    status.textContent = '✓ ' + choice + ' 선택됨 — 적용 중입니다. 잠시 후 이 창은 닫혀도 됩니다.';
    document.querySelectorAll('.option__pick').forEach(b => b.disabled = true);
    try {
      await fetch('/__choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice, topic: ${JSON.stringify(topic)} })
      });
    } catch (e) {
      status.textContent = choice + ' 선택 — 서버 통신 실패: ' + e.message;
    }
  });
});
</script>
</body>
</html>`;
}

const args = parseArgs(process.argv.slice(2));

if (!args.topic || !args.question || !args.a || !args.b) {
  console.error(
    `Usage: vdx-decide --topic <name> --question "<question>" --a <file> --b <file> [--theme <id>] [--port <n>] [--timeout <secs>]

Reads two HTML fragment files (partial HTML, no <html>/<body> wrapper),
opens a side-by-side comparison in the user's browser, waits for the user
to click, and prints "A" or "B" to stdout. Exits 1 on timeout.

Defaults: --theme samsung-kr  --port 0 (auto)  --timeout 600`
  );
  process.exit(2);
}

const topic = args.topic;
const question = args.question;
const themeId = args.theme || "samsung-kr";
const requestedPort = Number(args.port) || 0;
const timeoutSec = Number(args.timeout) || 600;

const themeDir = join(PROJECT_ROOT, "themes", themeId);
if (!existsSync(themeDir)) {
  console.error(`vdx-decide: theme not found: ${themeDir}`);
  process.exit(2);
}

const aHtml = await readFile(resolve(args.a), "utf8");
const bHtml = await readFile(resolve(args.b), "utf8");

const chooserHtml = renderChooser({ question, topic });
const variantAPage = buildVariantPage(aHtml);
const variantBPage = buildVariantPage(bHtml);

let choice = null;
let resolveChoice;
const choicePromise = new Promise((res) => { resolveChoice = res; });

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/__choice" && req.method === "POST") {
      const ct = req.headers["content-type"] || "";
      if (!ct.includes("application/json")) {
        res.writeHead(415, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("unsupported content-type");
        return;
      }
      const chunks = [];
      let received = 0;
      let aborted = false;
      req.on("data", (c) => {
        if (aborted) return;
        received += c.length;
        if (received > 64 * 1024) {
          aborted = true;
          res.writeHead(413, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("payload too large");
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => {
        if (aborted) return;
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (parsed.choice === "A" || parsed.choice === "B") {
            choice = parsed.choice;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, choice }));
            setTimeout(() => resolveChoice(choice), 150);
            return;
          }
        } catch {}
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("invalid");
      });
      return;
    }

    if (url.pathname === "/tokens.css") {
      const data = await readFile(join(themeDir, "tokens.css"));
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" });
      res.end(data);
      return;
    }
    if (url.pathname === "/components.css") {
      const data = await readFile(join(themeDir, "components.css"));
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" });
      res.end(data);
      return;
    }
    if (url.pathname === "/variants/a") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(variantAPage);
      return;
    }
    if (url.pathname === "/variants/b") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(variantBPage);
      return;
    }
    if (url.pathname === "/" || url.pathname === "") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(chooserHtml);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  } catch (err) {
    console.error("vdx-decide error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    if (!res.writableEnded) res.end("internal error");
  }
});

server.listen(requestedPort, "127.0.0.1");
await once(server, "listening");
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

console.error(`vdx-decide: ${url}`);
console.error(`vdx-decide: opening browser, waiting for click (timeout ${timeoutSec}s)...`);

const opener =
  process.platform === "darwin" ? "open" :
  process.platform === "win32" ? "start \"\" " :
  "xdg-open";
exec(`${opener} ${url}`, (err) => {
  if (err) console.error(`vdx-decide: browser open failed (${err.message}). Open the URL manually.`);
});

const timeoutHandle = setTimeout(() => resolveChoice(null), timeoutSec * 1000);

const finalChoice = await choicePromise;
clearTimeout(timeoutHandle);
server.close();

if (!finalChoice) {
  console.error("vdx-decide: timeout — no choice made.");
  process.exit(1);
}

process.stdout.write(finalChoice + "\n");
process.exit(0);

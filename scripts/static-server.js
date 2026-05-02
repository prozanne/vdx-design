#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PORT = Number(process.env.PORT ?? 5757);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const choiceState = { choice: null, at: null };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/__choice" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.choice && typeof parsed.choice === "string") {
          choiceState.choice = parsed.choice;
          choiceState.at = new Date().toISOString();
        }
      } catch {}
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(choiceState));
    });
    return;
  }
  if (url.pathname === "/__choice" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(choiceState));
    return;
  }

  let path = decodeURIComponent(url.pathname);
  if (path === "/") path = "/index.html";
  const safe = normalize(join(ROOT, path));
  if (!safe.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const data = await readFile(safe);
    const type = MIME[extname(safe).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(data);
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "EISDIR") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`not found: ${path}`);
    } else {
      res.writeHead(500);
      res.end(String(err));
    }
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`vdx static server listening at http://127.0.0.1:${PORT}`);
});

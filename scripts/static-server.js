#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PORT = Number(process.env.PORT ?? 5757);
const MAX_CHOICE_BODY = 64 * 1024;

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
        if (received > MAX_CHOICE_BODY) {
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

    let path;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("bad request");
      return;
    }
    if (path === "/") path = "/index.html";
    const safe = resolve(join(ROOT, path));
    // Use path.relative + first-segment check so a sibling directory whose
    // name shares the ROOT prefix (e.g. ROOT-leak) cannot bypass via plain
    // string startsWith. relative() returns ".." or an "..-prefixed" path
    // for anything outside ROOT, and an absolute path for cross-device.
    const rel = relative(ROOT, safe);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
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
        res.end("not found");
      } else {
        console.error("static-server error:", err);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("internal error");
      }
    }
  } catch (err) {
    console.error("static-server unhandled:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    if (!res.writableEnded) res.end("internal error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`vdx static server listening at http://127.0.0.1:${PORT}`);
});

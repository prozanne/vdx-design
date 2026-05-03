// Pin the CSS payload size. The skill ships HTML+CSS reference output that
// lands in real product pages — bloat creeps in if no one watches. Budgets
// are generous (current actuals are ~5 KB tokens / ~16 KB components) so
// only meaningful regressions trip the test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { listThemes } from "../lib/theme-registry.js";

const BUDGET_RAW_KB = {
  "tokens.css":     8,    // current ~5 KB; budget allows growth without alarm
  "components.css": 24,   // current ~16 KB
};

const BUDGET_GZ_KB = {
  "tokens.css":     2,    // current ~1.3 KB
  "components.css": 6,    // current ~3.9 KB
};

for (const id of listThemes()) {
  for (const [file, kb] of Object.entries(BUDGET_RAW_KB)) {
    test(`themes/${id}/${file} stays under ${kb} KB raw`, () => {
      const path = resolve(`themes/${id}/${file}`);
      const size = statSync(path).size;
      assert.ok(
        size <= kb * 1024,
        `${file} is ${size} bytes (${(size / 1024).toFixed(1)} KB), budget ${kb} KB`,
      );
    });
  }

  for (const [file, kb] of Object.entries(BUDGET_GZ_KB)) {
    test(`themes/${id}/${file} stays under ${kb} KB gzipped`, () => {
      const path = resolve(`themes/${id}/${file}`);
      const gz = gzipSync(readFileSync(path), { level: 9 }).byteLength;
      assert.ok(
        gz <= kb * 1024,
        `${file} gzipped is ${gz} bytes (${(gz / 1024).toFixed(1)} KB), budget ${kb} KB`,
      );
    });
  }
}

// Enumerates themes on disk under themes/ and resolves them by id.
// Treats every direct subdirectory of themes/ that contains a theme.json
// as a registered theme.

import { readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTheme } from "./theme-loader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// The default themes directory is resolved relative to this file. Tests and
// embedders that need to point at a different directory MUST pass it
// explicitly via the `themesDir` parameter on `listThemes()` / `getTheme(id)`.
// We deliberately avoid an environment-variable override: a leaked CI env var
// would silently retarget the entire suite, while the explicit-argument path
// is always discoverable from the call site.
export const DEFAULT_THEMES_DIR = resolve(__dirname, "..", "themes");

export function listThemes(themesDir = DEFAULT_THEMES_DIR) {
  if (!existsSync(themesDir)) return [];
  const ids = [];
  for (const entry of readdirSync(themesDir)) {
    const dir = join(themesDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    if (!existsSync(join(dir, "theme.json"))) continue;
    ids.push(entry);
  }
  return ids.sort();
}

// A theme id must be all lowercase, start with a letter or digit, and contain
// only letters, digits, and hyphens. This prevents path traversal (e.g.
// "../etc") and absolute paths from sneaking through join().
//
// The schema's `id` pattern at themes/theme-schema.json#/properties/id MUST
// match this regex literally. tests/manifest-sync.test.js pins them together.
export const VALID_THEME_ID_SOURCE = "^[a-z0-9][a-z0-9-]*$";
const VALID_THEME_ID = new RegExp(VALID_THEME_ID_SOURCE);

export function getTheme(id, themesDir = DEFAULT_THEMES_DIR) {
  if (typeof id !== "string" || !VALID_THEME_ID.test(id)) {
    throw new Error(
      `Invalid theme id '${id}': must match ${VALID_THEME_ID} (lowercase letters/digits/hyphens, starting with a letter or digit).`,
    );
  }
  const dir = join(themesDir, id);
  if (!existsSync(join(dir, "theme.json"))) {
    throw new Error(
      `Unknown theme '${id}'. Available: ${listThemes(themesDir).join(", ") || "(none)"}`,
    );
  }
  const theme = loadTheme(dir);
  if (theme.id !== id) {
    throw new Error(
      `Theme directory '${id}' contains theme.json with mismatched id '${theme.id}'`,
    );
  }
  return { ...theme, dir };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = listThemes();
  if (ids.length === 0) {
    console.log("No themes registered.");
  } else {
    console.log("Registered themes:");
    for (const id of ids) {
      const t = getTheme(id);
      console.log(`  - ${id} — ${t.name} v${t.version}`);
    }
  }
}

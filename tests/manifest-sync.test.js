import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const plugin = JSON.parse(readFileSync(resolve("plugin.json"), "utf8"));

test("plugin.json and package.json agree on name", () => {
  assert.equal(plugin.name, pkg.name);
});

test("plugin.json and package.json agree on version", () => {
  assert.equal(plugin.version, pkg.version);
});

test("plugin.json does not duplicate the description (package.json is the source of truth)", () => {
  assert.equal(
    plugin.description,
    undefined,
    "plugin.json should not carry its own `description`; rely on package.json",
  );
  assert.ok(
    pkg.description && pkg.description.length > 0,
    "package.json must have a description",
  );
});

test("plugin.json carries no cargo-cult fields", () => {
  // If a field appears in plugin.json, it MUST be either consumed by the
  // skill loader or referenced by lib/. Anything else is cargo and rots.
  // Update this list as the manifest grows real consumers.
  const allowed = new Set(["name", "displayName", "version", "skills"]);
  const extras = Object.keys(plugin).filter(k => !allowed.has(k));
  assert.deepEqual(
    extras,
    [],
    `plugin.json carries fields with no consumer: ${extras.join(", ")}. ` +
    `Either wire them into lib/ or drop them.`,
  );
});

test("schema's id pattern matches the registry's id pattern (no drift)", async () => {
  const schema = JSON.parse(readFileSync(resolve("themes/theme-schema.json"), "utf8"));
  const { VALID_THEME_ID_SOURCE } = await import("../lib/theme-registry.js");
  assert.equal(
    schema.properties.id.pattern,
    VALID_THEME_ID_SOURCE,
    "themes/theme-schema.json#/properties/id/pattern must equal lib/theme-registry.js VALID_THEME_ID_SOURCE",
  );
});

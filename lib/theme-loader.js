// Loads a theme.json file and validates it against themes/theme-schema.json.
// Uses a hand-rolled validator (no external deps) keyed off the schema's
// `required` lists. This is intentionally narrow — it catches missing tokens
// and obvious type errors, which is what theme contributors need.
//
// Behavioural notes for schema authors:
//   - Validator is JSON Schema Draft-07 ECMA-mode-only. Patterns are passed
//     verbatim to JS RegExp. They MUST be anchored with ^...$.
//   - When a node uses `$ref`, sibling keys are forbidden (Draft-07 ignores
//     them, so silently dropping them masks intent). The validator throws.
//   - Only `type: "object"` and `type: "string"` are supported. Adding any
//     other type without first extending this validator is a hard error,
//     not a silent skip.
//   - Token values are opaque strings. Using CSS `var(...)` references inside
//     theme.json is unsupported — the loader does not resolve them and the
//     CSS generator emits them verbatim, which means the resulting tokens.css
//     will silently inherit whatever a downstream stylesheet defines for the
//     referenced var. Author tokens with literal values only.

import { readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "..", "themes", "theme-schema.json");

let cachedSchema = null;
function getSchema() {
  if (cachedSchema) return cachedSchema;
  cachedSchema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  return cachedSchema;
}

function resolveRef(schema, ref) {
  if (!ref.startsWith("#/")) throw new Error(`Unsupported $ref: ${ref}`);
  const parts = ref.slice(2).split("/");
  let node = schema;
  for (const p of parts) {
    node = node[p];
    if (node === undefined) throw new Error(`Bad $ref: ${ref}`);
  }
  return node;
}

// Compile-once cache for schema patterns. Bounded so a long-running consumer
// passing many ad-hoc schemas can't grow the map without limit. The canonical
// schema uses ~10 unique patterns, so 64 leaves comfortable headroom for
// custom-schema test cases without ever evicting in normal operation. FIFO
// eviction (Map preserves insertion order, so keys().next() is the oldest).
const REGEX_CACHE_MAX = 64;
const REGEX_CACHE = new Map();
function matchesPattern(value, pattern) {
  let re = REGEX_CACHE.get(pattern);
  if (!re) {
    if (REGEX_CACHE.size >= REGEX_CACHE_MAX) {
      // Evict the oldest entry. Map preserves insertion order, so the first
      // key returned by keys() is the oldest.
      const oldest = REGEX_CACHE.keys().next().value;
      REGEX_CACHE.delete(oldest);
    }
    re = new RegExp(pattern);
    REGEX_CACHE.set(pattern, re);
  }
  return re.test(value);
}

// Hard cap on any token value. The actual tokens we ship are 2–3 orders of
// magnitude shorter than this; the cap exists so a corrupted theme.json
// (or a malicious one) can't blow up the error path or downstream tooling
// with megabyte-sized strings.
const MAX_STRING_LENGTH = 10000;

// Object keys we never accept anywhere in a theme. These are JS prototype
// pillars; allowing them through validation would let a malformed theme
// poison Object.prototype on any consumer that does naive `Object.assign`
// or `{...theme}` merges. The schema's `additionalProperties: false` would
// catch them at most levels, but pattern-property maps (spacing, neutral,
// shadow, etc.) deliberately accept open key sets — which is exactly where
// a `__proto__: {...}` payload would slip through.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Truncate a JSON-stringified value for inclusion in error messages. Errors
// surface in test output and CI logs; we want enough to identify the bad
// value without dumping a multi-kB shadow string.
function previewValue(v) {
  let s;
  try {
    s = JSON.stringify(v);
  } catch {
    s = String(v);
  }
  if (s === undefined) s = String(v);
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
}

function validate(value, schema, rootSchema, path, errors) {
  if (schema.$ref) {
    const siblings = Object.keys(schema).filter(k => k !== "$ref");
    if (siblings.length > 0) {
      throw new Error(
        `Schema at ${path} uses \`$ref\` alongside sibling keys [${siblings.join(", ")}]. ` +
        `Draft-07 ignores those siblings, which silently drops validation. ` +
        `Move them into the referenced definition or drop the $ref.`,
      );
    }
    schema = resolveRef(rootSchema, schema.$ref);
  }

  const expectedType = schema.type;
  if (expectedType === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push(`${path}: expected object, got ${previewValue(value)}`);
      return;
    }
    // Reject prototype-pollution keys before any other check so a hostile
    // input fails fast with a clear message instead of triggering downstream
    // schema-mismatch noise.
    for (const k of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(k)) {
        errors.push(
          `${path}.${k}: forbidden key '${k}' (prototype-pollution risk); ` +
          `value=${previewValue(value[k])}`,
        );
      }
    }
    for (const req of schema.required ?? []) {
      if (!(req in value)) errors.push(`${path}.${req}: missing required field`);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      const patternProps = schema.patternProperties ?? {};
      for (const k of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(k)) continue; // already reported
        if (allowed.has(k)) continue;
        const matchedPattern = Object.keys(patternProps).find(p => matchesPattern(k, p));
        if (!matchedPattern) {
          errors.push(`${path}.${k}: unexpected property; value=${previewValue(value[k])}`);
        }
      }
    }
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      if (k in value) validate(value[k], sub, rootSchema, `${path}.${k}`, errors);
    }
    for (const [pattern, sub] of Object.entries(schema.patternProperties ?? {})) {
      for (const k of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(k)) continue; // already reported
        if (schema.properties && k in schema.properties) continue;
        if (matchesPattern(k, pattern)) {
          validate(value[k], sub, rootSchema, `${path}.${k}`, errors);
        }
      }
    }
  } else if (expectedType === "string") {
    if (typeof value !== "string") {
      errors.push(`${path}: expected string, got ${previewValue(value)}`);
      return;
    }
    if (value.length > MAX_STRING_LENGTH) {
      errors.push(
        `${path}: string length ${value.length} exceeds max ${MAX_STRING_LENGTH}; ` +
        `value=${previewValue(value)}`,
      );
      return;
    }
    if (schema.minLength != null && value.length < schema.minLength) {
      errors.push(
        `${path}: shorter than minLength ${schema.minLength}; value=${previewValue(value)}`,
      );
    }
    if (schema.pattern && !matchesPattern(value, schema.pattern)) {
      errors.push(
        `${path}: does not match pattern ${schema.pattern}; value=${previewValue(value)}`,
      );
    }
  } else if (expectedType !== undefined) {
    // Validator only supports object/string. Anything else is a programmer
    // error in the schema, not a data error — fail loudly so a future schema
    // change that introduces e.g. `type: "number"` doesn't silently pass
    // unvalidated data through.
    throw new Error(
      `Schema at ${path} declares type=${JSON.stringify(expectedType)} which this validator does not implement. ` +
      `Extend lib/theme-loader.js before adding new types to the schema.`,
    );
  }
}

// `customSchema` is intended for tests of validator behaviour that aren't
// reachable through the canonical schema (e.g. $ref-with-siblings). Production
// callers omit it.
export function validateTheme(theme, customSchema = null) {
  const schema = customSchema ?? getSchema();
  const errors = [];
  validate(theme, schema, schema, "theme", errors);
  return errors;
}

export function loadTheme(themeDir) {
  const path = join(themeDir, "theme.json");
  let theme;
  try {
    theme = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`Failed to read theme at ${path}: ${e.message}`);
  }
  const errors = validateTheme(theme);
  if (errors.length > 0) {
    throw new Error(
      `Invalid theme at ${path}:\n  - ${errors.join("\n  - ")}`
    );
  }
  return theme;
}

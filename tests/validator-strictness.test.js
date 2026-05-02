import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTheme } from "../lib/theme-loader.js";

// These tests exercise validator behaviours that aren't reachable through the
// real schema, by handing validateTheme a custom schema.

test("validator throws when a $ref node has sibling keys", () => {
  const schema = {
    type: "object",
    required: ["color"],
    additionalProperties: false,
    properties: {
      color: {
        $ref: "#/definitions/color",
        description: "this sibling silently disappears under Draft-07",
      },
    },
    definitions: {
      color: { type: "string", pattern: "^#.*$" },
    },
  };
  assert.throws(
    () => validateTheme({ color: "#000" }, schema),
    /\$ref.*alongside sibling keys.*description/,
  );
});

test("validator throws when the schema declares an unsupported type", () => {
  const schema = {
    type: "object",
    required: ["count"],
    additionalProperties: false,
    properties: {
      count: { type: "integer" },
    },
  };
  assert.throws(
    () => validateTheme({ count: 5 }, schema),
    /type="integer".*does not implement/,
  );
});

test("validator handles correctly-formed $ref without siblings", () => {
  const schema = {
    type: "object",
    required: ["color"],
    additionalProperties: false,
    properties: {
      color: { $ref: "#/definitions/color" },
    },
    definitions: {
      color: { type: "string", pattern: "^#.*$" },
    },
  };
  assert.deepEqual(validateTheme({ color: "#fff" }, schema), []);
  assert.equal(validateTheme({ color: "rgb(0,0,0)" }, schema).length, 1);
});

test("validator rejects __proto__ even inside a patternProperties bag", () => {
  // The schema below would *technically* allow any key matching /^.+$/ — and
  // __proto__ does — but we want that rejected as a hard error before the
  // pattern even runs, because Object.assign-style merges in a consumer
  // would then poison Object.prototype.
  const schema = {
    type: "object",
    additionalProperties: false,
    patternProperties: { "^.+$": { type: "string" } },
  };
  // JSON.parse is required: object literals with `__proto__:` get special
  // semantics and never become own properties.
  const evil = JSON.parse('{"__proto__": "boom"}');
  const errors = validateTheme(evil, schema);
  assert.ok(
    errors.some(e => /__proto__.*forbidden key/.test(e)),
    `expected forbidden-key error, got: ${errors.join(" | ")}`,
  );
});

test("validator rejects 'constructor' and 'prototype' as keys", () => {
  const schema = {
    type: "object",
    additionalProperties: false,
    patternProperties: { "^.+$": { type: "string" } },
  };
  for (const key of ["constructor", "prototype"]) {
    const obj = { [key]: "x" };
    const errors = validateTheme(obj, schema);
    assert.ok(
      errors.some(e => new RegExp(`${key}.*forbidden key`).test(e)),
      `expected forbidden-key error for '${key}', got: ${errors.join(" | ")}`,
    );
  }
});

test("validator rejects strings longer than the 10000-char cap", () => {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: { x: { type: "string" } },
  };
  const errors = validateTheme({ x: "a".repeat(10001) }, schema);
  assert.ok(
    errors.some(e => /string length 10001 exceeds max 10000/.test(e)),
    `expected length-cap error, got: ${errors.join(" | ")}`,
  );
});

test("validator includes the offending value in error messages", () => {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: { color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" } },
  };
  const errors = validateTheme({ color: "not-a-hex" }, schema);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /value=/);
  assert.match(errors[0], /"not-a-hex"/);
});

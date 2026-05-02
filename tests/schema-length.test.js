import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Pin the contract of #/definitions/length so theme contributors know what
// CSS values they can use and so a future schema-tightening doesn't silently
// reject values that were valid yesterday.

const schema = JSON.parse(readFileSync(resolve("themes/theme-schema.json"), "utf8"));
const lengthRe = new RegExp(schema.definitions.length.pattern);

const ACCEPT = [
  "0",
  "1px",
  "16px",
  "1.5px",
  "0.5rem",
  ".5rem",
  "1rem",
  "100%",
  "50vh",
  "100dvh",
  "30cqw",
  "12pt",
  "-0.02em",
  "-1px",
  "calc(100% - 16px)",
  "calc(1px + 2px)",                   // simplest realistic
  "clamp(16px, 4vw, 32px)",
  "min(100%, 1280px)",
  "max(0px, 4vw)",
  "calc(min(100%, 1280px) + 16px)",    // nested math fns
];

const REJECT = [
  "",
  "16",                  // missing unit
  "px",                  // missing number
  "00px",                // leading-zero integer
  "01rem",               // leading-zero integer
  "-0px",                // negative zero with leading zero
  "-0",                  // bare negative zero (sign on a zero is meaningless)
  "-0.0px",              // negative zero in decimal form
  "16XX",                // unknown unit
  "1.px",                // dangling decimal point
  "1.5.5px",             // two decimals
  "1ex",                 // unsupported unit
  "1mm",                 // unsupported unit
  "abc",                 // not a length
  "calc()",              // empty math fn body
  "calc( )",             // whitespace-only math fn body
  "calc(\t)",            // tab-only math fn body
  "calc(>)",             // forbidden char
  "calc(1px\n+ 2px)",    // newline in math-fn body
  "calc(1px\r+ 2px)",    // carriage return in math-fn body
  "-calc(1px)",          // sign on a math fn
  "calc(1px) extra",     // trailing junk after close-paren
  "expr(1px)",           // unsupported math fn
];

for (const value of ACCEPT) {
  test(`#/definitions/length accepts ${JSON.stringify(value)}`, () => {
    assert.ok(lengthRe.test(value), `expected ${JSON.stringify(value)} to be accepted`);
  });
}

for (const value of REJECT) {
  test(`#/definitions/length rejects ${JSON.stringify(value)}`, () => {
    assert.equal(lengthRe.test(value), false, `expected ${JSON.stringify(value)} to be rejected`);
  });
}

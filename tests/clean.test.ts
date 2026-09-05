import test from "node:test";
import assert from "node:assert/strict";
import { clean } from "../src/clean";

test("strips trailing whitespace from every line", () => {
  assert.equal(clean("alpha   \nbravo\t\ncharlie "), "alpha\nbravo\ncharlie");
});

test("converts tabs to two spaces", () => {
  assert.equal(clean("\tindented\na\tb"), "  indented\na  b");
});

test("normalizes CRLF and lone CR line endings", () => {
  assert.equal(clean("one\r\ntwo\rthree"), "one\ntwo\nthree");
});

test("collapses runs of blank lines to a single blank line", () => {
  assert.equal(clean("para one\n\n\n\n\npara two"), "para one\n\npara two");
  assert.equal(clean("a\n\nb"), "a\n\nb", "a single blank line is left alone");
  // Lines of only whitespace count as blank.
  assert.equal(clean("a\n   \n\t\n\nb"), "a\n\nb");
});

test("trims leading and trailing blank lines and emits no trailing newline", () => {
  assert.equal(clean("\n\n  \nbody\n\n   \n\n"), "body");
});

test("preserves leading indentation and runs of spaces inside a line", () => {
  const input = "    four spaces in\nkey    value    aligned";
  assert.equal(clean(input), input);
});

test("preserves a nested bullet list", () => {
  const input = ["- top", "  - nested", "    - deeper", "- second top", "  1. ordered", "     continuation"].join("\n");
  assert.equal(clean(input), input);
});

test("passes a fenced block through verbatim", () => {
  const input = [
    "Here is code:",
    "",
    "```js",
    "const a = 1;   ",
    "",
    "",
    "",
    "\tif (a) {}   ",
    "```",
    "",
    "Done.",
  ].join("\n");
  assert.equal(clean(input), input, "fence content keeps blank lines, tabs and trailing spaces");
});

test("handles tilde fences and fences with no language tag", () => {
  const input = ["~~~", "raw   ", "", "", "text", "~~~", "", "```", "more   ", "```"].join("\n");
  assert.equal(clean(input), input);
});

test("still tidies text outside a fence", () => {
  const input = ["intro   ", "", "", "```", "kept   ", "```", "", "", "outro   ", ""].join("\n");
  const expected = ["intro", "", "```", "kept   ", "```", "", "outro"].join("\n");
  assert.equal(clean(input), expected);
});

test("leaves the rest of the text alone after an unterminated fence", () => {
  const input = ["intro   ", "", "", "```py", "x = 1   ", "", "", "", "y = 2   ", "", ""].join("\n");
  const expected = ["intro", "", "```py", "x = 1   ", "", "", "", "y = 2   ", "", ""].join("\n");
  assert.equal(clean(input), expected);
});

test("does not treat an inline or short backtick run as a fence", () => {
  const input = "use `` or ` here\n``not a fence";
  assert.equal(clean(input), input);
});

test("returns an identical string for already-clean input", () => {
  const input = [
    "# Title",
    "",
    "Some prose with  deliberate spacing.",
    "",
    "- bullet",
    "  - nested bullet",
    "",
    "```ts",
    "const x: number = 1;",
    "```",
    "",
    "Closing line.",
  ].join("\n");
  const once = clean(input);
  assert.equal(once, input);
  assert.equal(clean(once), once, "clean is idempotent");
});

test("returns an empty string for empty or whitespace-only input", () => {
  assert.equal(clean(""), "");
  assert.equal(clean("   \n\t\n  \n"), "");
});

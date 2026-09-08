import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const previewSource = await readFile(new URL("../preview.js", import.meta.url), "utf8");

assert.match(
  indexSource,
  /preview\.js\?v=20260909-0200/,
  "top-level Safari/Web entry must publish the post-#1349 preview generation",
);
assert.doesNotMatch(
  indexSource,
  /preview\.js\?v=20260907-1930/,
  "retired outer preview generation must not remain after Party owner-result persistence wiring",
);
assert.match(
  previewSource,
  /preview-app\.js\?v=20260909-0200/,
  "published preview must fetch the post-#1349 preview-app generation",
);
assert.doesNotMatch(
  previewSource,
  /preview-app\.js\?v=20260907-1000/,
  "retired preview-app generation must not remain in the public preview chain",
);

console.log("party-owner-result-public-generation-smoke: ok");

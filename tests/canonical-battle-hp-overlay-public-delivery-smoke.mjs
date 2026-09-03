import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.js"), "utf8");

assert.match(
  index,
  /preview\.js\?v=20260904-0530/,
  "HTML entry must request a fresh preview generation after canonical Battle HP overlay wiring",
);
assert.match(
  preview,
  /canonical-battle-ui-assets\.js\?v=20260904-0500/,
  "fresh preview generation must request the canonical Battle UI adapter containing the HP overlay",
);

console.log("canonical Battle HP overlay public delivery smoke passed");

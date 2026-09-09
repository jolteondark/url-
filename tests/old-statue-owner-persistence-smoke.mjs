import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-old-statue-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /request_save[\s\S]*old_statue_resolved/,
  "resolved Old Statue mutations must emit save intent into operations",
);
assert.match(
  source,
  /function operationsRequestSave\([\s\S]*operation\?\.op === "request_save"/,
  "Safari persistence projection must be derived from operation save intent",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  "fixed persistence booleans must not remain a second save authority",
);
assert.match(
  source,
  /persistenceRequested:operationsRequestSave\(state\.last_operations\)/,
  "completed Old Statue routes must project owner-driven request_save",
);

console.log("old statue owner persistence smoke: ok");

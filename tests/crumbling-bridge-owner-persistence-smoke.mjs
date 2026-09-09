import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-crumbling-bridge-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /request_save[\s\S]*crumbling_bridge_resolved/,
  "resolved Crumbling Bridge mutations must emit save intent into operations",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must be derived from operation save intent",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\)(?:\s*\|\|\s*Boolean\(runEnd\.finished\))?/,
  "resolved-state and run-end booleans must not remain a second persistence truth",
);
assert.match(
  source,
  /eventOperations\.push\(\{ op:"request_save", reason:"crumbling_bridge_resolved" \}\)/,
  "run-end continuation must retain the resolved event save request before lifecycle operations",
);

console.log("crumbling bridge owner persistence smoke: ok");

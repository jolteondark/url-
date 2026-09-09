import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-flooded-river-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /request_save[\s\S]*flooded_river_resolved/,
  "resolved Flooded River mutations must emit owner save intent",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must be derived from owner operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\)/,
  "resolved-state booleans must not remain a second persistence truth",
);
assert.match(
  source,
  /result:\s*"reward_bag_full"[\s\S]*persistenceRequested:\s*false/,
  "failed reward preflight must remain non-persistent",
);

console.log("flooded river owner persistence smoke: ok");

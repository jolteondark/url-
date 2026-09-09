import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-burning-wagon-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /request_save[\s\S]*burning_wagon_resolved/,
  "resolved Burning Wagon mutations must emit owner save intent",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must be derived from owner operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\)(?:\s*\|\|\s*runEnd\.finished)?/,
  "resolved-state booleans must not remain a second persistence truth",
);
assert.match(
  source,
  /result:"reward_bag_full"[\s\S]*persistenceRequested:false/,
  "failed reward preflight must remain non-persistent",
);
assert.match(
  source,
  /result:"fire_choice_required"[\s\S]*persistenceRequested:false/,
  "unresolved fire choice presentation must remain non-persistent",
);

console.log("burning wagon owner persistence smoke: ok");

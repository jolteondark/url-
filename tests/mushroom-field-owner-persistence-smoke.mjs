import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-mushroom-field-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /\(owner\.result \|\| runEnd\.finished\)[\s\S]*request_save[\s\S]*mushroom_field_resolved/,
  "resolved Mushroom Field mutations must emit owner-result request_save intent",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Mushroom Field persistence flag must be derived from owner operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\) \|\| runEnd\.finished/,
  "Mushroom Field must not keep a Safari-local persistence truth",
);
assert.match(
  source,
  /result:\s*"target_unavailable"[\s\S]*persistenceRequested:\s*false/,
  "unavailable target must remain non-persistent",
);
assert.match(
  source,
  /result:\s*receipt\.result[\s\S]*persistenceRequested:\s*false/,
  "failed sell receipt must remain non-persistent",
);

console.log("mushroom field owner persistence smoke: ok");

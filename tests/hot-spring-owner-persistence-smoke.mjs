import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-hot-spring-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /\(owner\.result \|\| runEnd\.finished\)[\s\S]*request_save[\s\S]*hot_spring_resolved/,
  "resolved Hot Spring mutations must emit owner-result request_save intent",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Hot Spring persistence flag must be derived from owner operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\) \|\| runEnd\.finished/,
  "Hot Spring must not keep a Safari-local persistence truth",
);
assert.match(
  source,
  /result:"reward_bag_full"[\s\S]*persistenceRequested:false/,
  "bag-full preflight must remain non-persistent",
);

console.log("hot spring owner persistence smoke: ok");

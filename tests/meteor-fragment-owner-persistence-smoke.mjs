import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-meteor-fragment-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /eventOperations[\s\S]*request_save[\s\S]*meteor_fragment_resolved/,
  "resolved Meteor Fragment mutations must emit owner save intent",
);
assert.match(
  source,
  /persistenceRequested:state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must derive from owner operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\)/,
  "Safari must not treat owner.result itself as a second persistence truth",
);
assert.match(
  source,
  /result:"reward_bag_full"[\s\S]*persistenceRequested:false/,
  "Bag-full preflight must remain non-persistent",
);

console.log("meteor fragment owner persistence smoke: ok");

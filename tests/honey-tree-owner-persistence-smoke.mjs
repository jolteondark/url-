import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-honey-tree-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /ensureResolvedSaveIntent[\s\S]*request_save[\s\S]*honey_tree_resolved/,
  "resolved Honey Tree mutations must emit owner save intent",
);
assert.match(
  source,
  /normal_event_post_battle/,
  "Honey Tree Battle RETURN must preserve the shared post-battle save intent",
);
assert.match(
  source,
  /persistenceRequested:persistenceRequested\(state\.last_operations\)/,
  "Safari persistence projection must be derived from owner operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\)/,
  "resolved-state booleans must not remain a second persistence truth",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  "Battle RETURN must not carry a fixed persistence truth",
);
assert.match(
  source,
  /result:"reward_bag_full"[\s\S]*persistenceRequested:false/,
  "failed reward preflight must remain non-persistent",
);

console.log("honey tree owner persistence smoke: ok");

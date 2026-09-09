import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-honey-tree-interaction.js", import.meta.url), "utf8");

assert.match(
  index,
  /\.\/runtime\/safari-honey-tree-interaction\.js\?v=20260909-1900/,
  "public import map must publish the post-#1392 Honey Tree generation",
);
assert.doesNotMatch(
  index,
  /\.\/runtime\/safari-honey-tree-interaction\.js\?v=20260904-0230/,
  "stale pre-#1392 Honey Tree generation must not remain public",
);
assert.match(
  source,
  /ensureResolvedSaveIntent[\s\S]*request_save[\s\S]*honey_tree_resolved/,
  "resolved Honey Tree mutations must retain owner save intent",
);
assert.match(
  source,
  /persistenceRequested:persistenceRequested\(state\.last_operations\)/,
  "Safari persistence projection must stay owner-operation derived",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*Boolean\(owner\.result\)|persistenceRequested:\s*true/,
  "Safari must not restore a second resolved-state persistence truth",
);

console.log("honey tree owner public generation smoke: ok");

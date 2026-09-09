import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-flooded-river-interaction.js", import.meta.url), "utf8");

assert.match(
  index,
  /\.\/runtime\/safari-flooded-river-interaction\.js\?v=20260909-1700/,
  "public import map must publish the post-#1386 Flooded River generation",
);
assert.doesNotMatch(
  index,
  /\.\/runtime\/safari-flooded-river-interaction\.js\?v=20260904-0830/,
  "stale pre-#1386 Flooded River generation must not remain public",
);
assert.match(
  source,
  /request_save[\s\S]*flooded_river_resolved/,
  "resolved Flooded River mutations must retain owner save intent",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must stay owner-operation derived",
);

console.log("flooded river owner public generation smoke: ok");

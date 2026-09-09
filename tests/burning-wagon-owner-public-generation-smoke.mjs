import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-burning-wagon-interaction.js", import.meta.url), "utf8");

assert.match(
  index,
  /\.\/runtime\/safari-burning-wagon-interaction\.js\?v=20260909-1800/,
  "public import map must publish the post-#1389 Burning Wagon generation",
);
assert.doesNotMatch(
  index,
  /\.\/runtime\/safari-burning-wagon-interaction\.js\?v=20260904-0930/,
  "stale pre-#1389 Burning Wagon generation must not remain public",
);
assert.match(
  source,
  /request_save[\s\S]*burning_wagon_resolved/,
  "resolved Burning Wagon mutations must retain owner save intent",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must stay owner-operation derived",
);

console.log("burning wagon owner public generation smoke: ok");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-mushroom-field-interaction.js", import.meta.url), "utf8");

assert.match(
  index,
  /\.\/runtime\/safari-mushroom-field-interaction\.js\?v=20260909-1600/,
  "public import map must deliver the owner-driven Mushroom Field adapter generation",
);
assert.doesNotMatch(
  index,
  /\.\/runtime\/safari-mushroom-field-interaction\.js\?v=20260904-1500/,
  "stale pre-owner Mushroom Field generation must not return to the public Safari path",
);
assert.match(
  source,
  /request_save[\s\S]*mushroom_field_resolved/,
  "Mushroom Field resolved mutations must keep owner save intent",
);
assert.match(
  source,
  /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  "Safari persistence projection must remain derived from owner operations",
);

console.log("mushroom field owner public generation smoke: ok");

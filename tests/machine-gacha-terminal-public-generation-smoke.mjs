import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  indexSource,
  /\.\/runtime\/safari-playable-integration-pre-wounded\.js\?v=20260914-0900/,
  "public import map must deliver the terminal Machine Gacha persistence generation",
);
assert.doesNotMatch(
  indexSource,
  /\.\/runtime\/safari-playable-integration-pre-wounded\.js\?v=20260909-1115/,
  "stale pre-terminal-persistence playable integration generation must not remain public",
);

console.log("machine gacha terminal public generation smoke: ok");

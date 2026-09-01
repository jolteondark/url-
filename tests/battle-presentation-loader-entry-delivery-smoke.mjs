import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const revisionMatch = loader.match(/const BATTLE_PRESENTATION_PUBLIC_REVISION = "([^"]+)";/);
assert.ok(revisionMatch, "Battle public revision must remain explicit in deferred-ui-loader.js");

const revision = revisionMatch[1];
assert.match(
  index,
  new RegExp(`deferred-ui-loader\\.js\\?v=${revision.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`),
  "index.html must cache-bust the deferred loader with the current Battle presentation revision",
);
assert.doesNotMatch(
  index,
  /deferred-ui-loader\.js\?v=20260902-0008/,
  "stale pre-#1115 deferred loader pin must not return",
);

console.log(`ok - Battle presentation outer loader pin ${revision}`);

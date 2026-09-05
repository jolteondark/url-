import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sharedItemOwner = readFileSync(new URL("../runtime/safari-battle-item-mutation-owner.js", import.meta.url), "utf8");

assert.match(sharedItemOwner, /from ["']\.\/safari-battle-stat-boost-item-use\.js["']/,
  "shared Battle ITEM owner must import the stat-boost mutation owner");
assert.match(index, /"\.\/runtime\/safari-battle-stat-boost-item-use\.js":\s*"\.\/runtime\/safari-battle-stat-boost-item-use\.js\?v=20260906-0430"/,
  "served Safari import map must cache-bust the boundary-capable stat-boost owner");

console.log("boundary Battle stat-boost item public delivery smoke: ok");

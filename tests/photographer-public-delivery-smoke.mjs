import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-photographer-interaction.js"), "utf8");

assert.match(index,
  /"\.\/runtime\/safari-photographer-interaction\.js": "\.\/runtime\/safari-photographer-interaction\.js\?v=20260903-2000"/,
  "Safari public import map must publish the post-#1165 Photographer generation");
assert.match(adapter, /commitSafariBagEconomyReceipt\(runtime, \{ reward, money \}\)/,
  "published Photographer adapter must route post-Battle reward+money through the shared receipt");
assert.match(adapter, /if \(!receipt\.success\)[\s\S]*persistenceRequested:false/,
  "published Photographer adapter must keep no-room settlement retry-safe");
assert.doesNotMatch(adapter, /function addMoney\s*\(/,
  "published Photographer adapter must not restore local money mutation");

console.log("Photographer public delivery smoke passed");

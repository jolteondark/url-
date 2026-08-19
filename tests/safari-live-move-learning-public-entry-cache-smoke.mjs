import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const prewarm = readFileSync(new URL("../runtime/safari-battle-runtime-prewarm.js", import.meta.url), "utf8");

const match = index.match(/runtime\/safari-battle-runtime-prewarm\.js\?v=([0-9-]+)/);
assert.ok(match, "public index must load the battle runtime prewarm with an explicit cache key");
assert.notEqual(match[1], "20260818-1407", "public index must not retain the pre-#454 prewarm cache key");
assert.match(prewarm, /import\s+["']\.\/safari-browser-move-learning-resolver-install\.js["'];/, "live prewarm must install the browser move-learning resolver");

console.log("PASS safari live move-learning public entry cache smoke");

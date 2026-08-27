import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const healing = fs.readFileSync(new URL("../runtime/safari-pokemon-healing.js", import.meta.url), "utf8");
const core = fs.readFileSync(new URL("../runtime/mapless-v108-party-percent-heal.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-pokemon-healing\.js": "\.\/runtime\/safari-pokemon-healing\.js\?v=20260827-2259"/);
assert.match(index, /"\.\/runtime\/mapless-v108-party-percent-heal\.js": "\.\/runtime\/mapless-v108-party-percent-heal\.js\?v=20260828-0001"/);
assert.match(healing, /from "\.\/mapless-v108-party-percent-heal\.js"/);
assert.match(core, /Math\.ceil\(totalHp \* frac\)/);
assert.doesNotMatch(core, /Math\.floor\(totalHp \* frac\)/);

console.log("Safari percent-heal core cache smoke passed");

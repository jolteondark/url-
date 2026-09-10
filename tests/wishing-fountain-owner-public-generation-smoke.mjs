import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const finalRoutes = readFileSync(new URL("../runtime/safari-wishing-fountain-final-routes.js", import.meta.url), "utf8");
const base = readFileSync(new URL("../runtime/safari-wishing-fountain-interaction.js", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-wishing-fountain-interaction\.js\?v=20260911-0120/);
assert.match(index, /\.\/runtime\/safari-wishing-fountain-final-routes\.js\?v=20260911-0120/);
assert.doesNotMatch(index, /\.\/runtime\/safari-wishing-fountain-final-routes\.js\?v=20260909-1400/);
assert.match(finalRoutes, /from "\.\/safari-wishing-fountain-interaction\.js";/);
assert.match(base, /function persistenceRequested\(state\)/);
assert.match(base, /operation\?\.op === "request_save"/);
assert.doesNotMatch(base, /persistenceRequested:\s*true/);
assert.equal((base.match(/persistenceRequested:persistenceRequested\(state\)/g) ?? []).length, 5);
assert.match(base, /const largePrice = 1200 \+ scalingValue\(runtime\) \* 200;/);

console.log("wishing fountain owner public generation smoke: ok");

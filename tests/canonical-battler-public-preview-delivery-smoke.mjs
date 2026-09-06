import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");

assert.match(index, /preview\.js\?v=20260906-1930/, "public index must request the refreshed preview generation");
assert.match(preview, /canonical-battle-battler-assets\.js\?v=20260906-1900/, "refreshed preview must request the post-KANGASKHAN battler resolver generation");

console.log("canonical battler public preview delivery smoke: ok");

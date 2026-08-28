import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const owner = readFileSync(new URL("../runtime/safari-old-statue-break-collapse.js", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../runtime/mapless-old-statue-flow.js", import.meta.url), "utf8");

assert.match(owner, /action !== "break"/);
assert.match(owner, /roll < 95/);
assert.match(owner, /resolveOldStatue\(\{ event, choice:"break" \}\)/);
assert.match(owner, /damageSafariPokemonPercent\(pokemon, percent\)/);
assert.match(owner, /applyCollapseDamage\(runtime, 15\)/);
assert.match(owner, /operation\?\.op !== "damage_party"/);
assert.match(owner, /board_consumed\[index\] = Boolean\(owner\.event\.normal_resolved\)/);
assert.match(owner, /request_save/);
assert.doesNotMatch(owner, /updatePokemonRuntime/);
assert.match(presentation, /safari-old-statue-break-collapse\.js\?v=20260828-2205/);
assert.doesNotMatch(presentation, /safari-old-statue-offer-continuation\.js\?v=20260828-1955/);
assert.match(canonical, /ops\.push\(\{op:'damage_party',percent:15\}\);return finish\(event,ops,'collapse_damage'\)/);

console.log("safari old statue break collapse smoke: ok");

import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync(new URL("../runtime/safari-battle-item-mutation-owner.js", import.meta.url), "utf8");
const normal = fs.readFileSync(new URL("../runtime/safari-normal-battle-lifecycle.js", import.meta.url), "utf8");
const boundary = fs.readFileSync(new URL("../runtime/safari-playable-integration-boundary.js", import.meta.url), "utf8");
const web = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");

assert.match(shared, /export function applySafariBattleItemMutation/);
assert.match(shared, /applySafariBagItemToPartyPokemon/);
assert.match(shared, /useSafariBattleStatBoostItem/);

assert.match(normal, /import \{ applySafariBattleItemMutation \} from "\.\/safari-battle-item-mutation-owner\.js"/);
assert.match(normal, /const itemUse = applySafariBattleItemMutation\(runtime, options\)/);
assert.doesNotMatch(normal, /applySafariBagItemToPartyPokemon/);
assert.doesNotMatch(normal, /useSafariBattleStatBoostItem/);

assert.match(boundary, /export function useSafariBoundaryBattleItem/);
assert.match(boundary, /beginSafariBattleCommand\(runtime, "item"\)/);
assert.match(boundary, /applySafariBattleItemMutation\(runtime, options\)/);
assert.match(boundary, /playerActionConsumedWithoutMove: true/);
assert.match(boundary, /commandKind: "item"/);
assert.match(boundary, /commitSafariBattleResolution\(runtime, resolution, commandKind/);
assert.match(boundary, /finalizeBoundaryBattle\(runtime, battle, battle\.decision\)/);
assert.match(boundary, /abortSafariBattleCommand\(runtime, "boundary item had no effect"\)/);

assert.doesNotMatch(web, /if \(needsFullBattleIntegration\(runtime\)\) throw new Error\("boundary battle item owner is unavailable"\)/);
assert.match(web, /module\.useSafariBoundaryBattleItem\(runtime, options\)/);

console.log("boundary battle item shared owner smoke: ok");

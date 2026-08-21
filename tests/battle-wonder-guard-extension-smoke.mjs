import assert from "node:assert/strict";
import {
  BATTLE_WONDER_GUARD_COVERAGE_CANONICAL,
  resolveWonderGuardTypeImmunityCanonical,
} from "../runtime/battle-core-wonder-guard-extension.js";

const pokemon = (ability, extra = {}) => ({ ability, ...extra });
const move = (id, category = "Physical") => ({ id, category, type: "NORMAL", power: category === "Status" ? 0 : 40 });

assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("NONE"), target: pokemon("WONDERGUARD"), move: move("TACKLE"), typeMod: 1,
}).typeIneffective, true);
assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("NONE"), target: pokemon("WONDERGUARD"), move: move("TACKLE"), typeMod: 0.5,
}).typeIneffective, true);
assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("NONE"), target: pokemon("WONDERGUARD"), move: move("TACKLE"), typeMod: 2,
}).typeIneffective, false);
assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("NONE"), target: pokemon("WONDERGUARD"), move: move("TAILWHIP", "Status"), typeMod: 1,
}).typeIneffective, false);
assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("NONE"), target: pokemon("WONDERGUARD"), move: move("STRUGGLE"), typeMod: 1,
}).typeIneffective, false);
assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("MOLDBREAKER"), target: pokemon("WONDERGUARD"), move: move("TACKLE"), typeMod: 1,
}).typeIneffective, false);
assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("NONE"), target: { ability: null, ability_id: "WONDERGUARD" }, move: move("TACKLE"), typeMod: 1,
}).typeIneffective, false);
assert.equal(resolveWonderGuardTypeImmunityCanonical({
  user: pokemon("NONE"), target: { ability_id: "WONDERGUARD" }, move: move("TACKLE"), typeMod: 1,
}).typeIneffective, true);
assert.deepEqual(BATTLE_WONDER_GUARD_COVERAGE_CANONICAL.abilityIds, ["WONDERGUARD"]);
assert.equal(BATTLE_WONDER_GUARD_COVERAGE_CANONICAL.classificationCounts.typeImmunityAbilities, 1);

console.log("battle Wonder Guard extension smoke: PASS");

import assert from "node:assert/strict";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import { resolveAccuracyDamageVerticalCanonical } from "../runtime/battle-core-accuracy-damage-vertical.js";

const pokemon = (types, level = 37) => ({
  species: "EEVEE",
  level,
  hp: 100,
  max_hp: 100,
  types,
  status: "NONE",
  stats: {
    ATTACK: 70,
    DEFENSE: 70,
    SPECIAL_ATTACK: 70,
    SPECIAL_DEFENSE: 70,
    SPEED: 70,
  },
  moves: [{ id: "SEISMICTOSS", pp: 20, ppup: 0 }],
});

const actor = pokemon(["FIGHTING"], 37);
const target = pokemon(["NORMAL"], 20);
const seismicToss = {
  id: "SEISMICTOSS",
  name: "Seismic Toss",
  category: "Physical",
  power: 0,
  accuracy: 100,
  type: "FIGHTING",
  priority: 0,
  total_pp: 20,
  function_code: "FixedDamageUserLevel",
};

const action = buildBrowserBattleActionInput({
  actor,
  target,
  move: seismicToss,
  moveIndex: 0,
  battlerIndex: 0,
  targetBattlerIndex: 1,
  randomRoll: 0,
  reflectPp: false,
});
assert.equal(action.damageInput, undefined,
  "FixedDamageUserLevel must not enter the ordinary power/stat/STAB damage formula");
assert.deepEqual(action.fixedDamageInput, {
  damage: 37,
  functionCode: "FixedDamageUserLevel",
  source: "Battle::Move::FixedDamageUserLevel",
});
const resolved = resolveAccuracyDamageVerticalCanonical(action);
assert.equal(resolved.accuracyHit, true);
assert.equal(resolved.calculatedDamage, 37,
  "Seismic Toss/Night Shade semantics must deal the user's level exactly");
assert.equal(resolved.fixedDamageResolution?.functionCode, "FixedDamageUserLevel");

const immuneTarget = pokemon(["GHOST"], 20);
const immune = buildBrowserBattleActionInput({
  actor,
  target: immuneTarget,
  move: seismicToss,
  moveIndex: 0,
  battlerIndex: 0,
  targetBattlerIndex: 1,
  randomRoll: 0,
  reflectPp: false,
});
assert.equal(immune.fixedDamageInput, undefined,
  "type immunity must gate fixed damage before HP reduction");
assert.equal(immune.typeEffectivenessResolution?.immune, true);
assert.equal(immune.hitLoopInput?.targetChecks?.[0]?.initialSuccessCheckInput?.typeIneffective, true,
  "fixed-damage moves must reuse the existing canonical type-immunity success gate");

console.log("browser fixed damage user-level smoke PASS");

import assert from "node:assert/strict";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import { calcDamageCanonical } from "../runtime/battle-core-accuracy-damage.js";

const moveMasters = {
  TACKLE: { id: "TACKLE", name: "Tackle", category: "Physical", power: 40, accuracy: 100, total_pp: 35, priority: 0, type: "NORMAL" },
  SWIFT: { id: "SWIFT", name: "Swift", category: "Special", power: 60, accuracy: 0, total_pp: 20, priority: 0, type: "NORMAL" },
};

const pokemon = (status) => ({
  species: "EEVEE",
  level: 50,
  hp: 100,
  max_hp: 100,
  status,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
  moves: [{ id: "TACKLE", pp: 35, ppup: 0 }, { id: "SWIFT", pp: 20, ppup: 0 }],
});
const target = pokemon("NONE");

function resolvedDamage(actor, move, moveIndex) {
  const action = buildBrowserBattleActionInput({
    actor,
    target,
    move,
    moveIndex,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  action.damageInput.damageMultiplierInput.randomRoll = 15;
  return { action, damage: calcDamageCanonical(action.damageInput).damage };
}

const healthyPhysical = resolvedDamage(pokemon("NONE"), moveMasters.TACKLE, 0);
const burnedPhysical = resolvedDamage(pokemon("BURN"), moveMasters.TACKLE, 0);
assert.equal(healthyPhysical.action.damageInput.damageMultiplierInput.userStatus, "NONE");
assert.equal(burnedPhysical.action.damageInput.damageMultiplierInput.userStatus, "BURN");
assert.equal(healthyPhysical.damage, 29, "healthy STAB Tackle should retain canonical damage");
assert.equal(burnedPhysical.damage, 14, "burned ordinary physical damage must use the existing canonical 1/2 burn multiplier");

const healthySpecial = resolvedDamage(pokemon("NONE"), moveMasters.SWIFT, 1);
const burnedSpecial = resolvedDamage(pokemon("BURN"), moveMasters.SWIFT, 1);
assert.equal(healthySpecial.damage, burnedSpecial.damage, "burn must not halve ordinary special damage");

console.log("ordinary burn damage owner smoke: ok");

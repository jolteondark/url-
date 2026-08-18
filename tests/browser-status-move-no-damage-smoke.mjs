import assert from "node:assert/strict";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";

const pokemon = (types) => ({
  species: "EEVEE",
  level: 20,
  hp: 50,
  max_hp: 50,
  types,
  stats: {
    ATTACK: 40,
    DEFENSE: 40,
    SPECIAL_ATTACK: 40,
    SPECIAL_DEFENSE: 40,
    SPEED: 40,
  },
  moves: [{ id: "GROWL", pp: 40, ppup: 0 }],
});

const actor = pokemon(["NORMAL"]);
const target = pokemon(["NORMAL"]);

const status = buildBrowserBattleActionInput({
  actor,
  target,
  move: {
    id: "GROWL",
    name: "Growl",
    category: "Status",
    power: 0,
    accuracy: 100,
    type: "NORMAL",
    priority: 0,
    total_pp: 40,
  },
  moveIndex: 0,
  battlerIndex: 0,
  targetBattlerIndex: 1,
  randomRoll: 0,
  reflectPp: false,
});
assert.equal(status.damageInput, undefined,
  "status moves must not enter the canonical damage formula where base power 0 is clamped to damage 1");
assert.deepEqual(status.accuracyInput, { baseAccuracy: 100, randomRoll: 0 },
  "status moves still use their canonical accuracy fact");

const damaging = buildBrowserBattleActionInput({
  actor,
  target,
  move: {
    id: "TACKLE",
    name: "Tackle",
    category: "Physical",
    power: 40,
    accuracy: 100,
    type: "NORMAL",
    priority: 0,
    total_pp: 35,
  },
  moveIndex: 0,
  battlerIndex: 0,
  targetBattlerIndex: 1,
  randomRoll: 0,
  reflectPp: false,
});
assert.equal(damaging.damageInput?.baseDamage, 40,
  "ordinary damaging moves must keep the existing canonical damage path");
assert.equal(damaging.damageInput?.damageMultiplierInput?.userHasType, true,
  "existing STAB wiring must remain intact");

console.log("browser status move no-damage smoke PASS");

import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { commitBattleSystemsStatusRuntime } from "../runtime/battle-status-runtime-integration.js";

SAFARI_MOVE_MASTERS.STUNSPORE = Object.freeze({
  id: "STUNSPORE",
  name: "Stun Spore",
  category: "Status",
  power: 0,
  accuracy: 75,
  total_pp: 30,
  priority: 0,
  type: "GRASS",
  function_code: "ParalyzeTarget",
});
SAFARI_MOVE_MASTERS.POISONPOWDER = Object.freeze({
  id: "POISONPOWDER",
  name: "Poison Powder",
  category: "Status",
  power: 0,
  accuracy: 75,
  total_pp: 35,
  priority: 0,
  type: "POISON",
  function_code: "PoisonTarget",
});
SAFARI_MOVE_MASTERS.THUNDERSHOCK = Object.freeze({
  id: "THUNDERSHOCK",
  name: "Thunder Shock",
  category: "Special",
  power: 40,
  accuracy: 100,
  total_pp: 30,
  priority: 0,
  type: "ELECTRIC",
  effect_chance: 10,
  function_code: "ParalyzeTarget",
});

const pokemon = ({ species = "EEVEE", types = ["NORMAL"], status = "NONE" } = {}) => ({
  species,
  level: 20,
  hp: 50,
  max_hp: 50,
  status,
  status_count: 0,
  types,
  stats: { ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  moves: [],
});

const actionFor = (moveId, accuracy = 75) => ({
  rounds: [{ actions: [{
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveId,
    accuracyInput: { baseAccuracy: accuracy, randomRoll: 0 },
  }] }],
});

const executedTurn = { operations: [{ op: "use_move", round: 1, action: 0 }] };

const ground = pokemon({ species: "SANDSHREW", types: ["GROUND"] });
const stunPrepared = prepareReflectedMajorStatusBattleInput({
  battleInput: actionFor("STUNSPORE"),
  pokemon: ground,
  reflectedBattlerIndex: 1,
});
assert.equal(stunPrepared.rounds[0].actions[0].battleStatusInput?.newStatus, "PARALYSIS",
  "Stun Spore must use status eligibility rather than Electric-style move type immunity");
assert.equal(stunPrepared.rounds[0].actions[0].majorStatusEffectResolution?.typeResolution, undefined);
stunPrepared.rounds[0].actions[0].accuracyResolution = { hit: true };
const stunCommit = commitBattleSystemsStatusRuntime({
  battleInput: stunPrepared,
  turn: executedTurn,
  pokemon: ground,
  reflectedBattlerIndex: 1,
});
assert.equal(stunCommit.pokemon.status, "PARALYSIS");

const electric = pokemon({ species: "PIKACHU", types: ["ELECTRIC"] });
const electricPrepared = prepareReflectedMajorStatusBattleInput({
  battleInput: actionFor("STUNSPORE"),
  pokemon: electric,
  reflectedBattlerIndex: 1,
});
assert.equal(electricPrepared.rounds[0].actions[0].battleStatusInput, undefined);
assert.equal(electricPrepared.rounds[0].actions[0].majorStatusEffectResolution?.reason, "type_immunity");

const poisonTarget = pokemon();
const poisonPrepared = prepareReflectedMajorStatusBattleInput({
  battleInput: actionFor("POISONPOWDER"),
  pokemon: poisonTarget,
  reflectedBattlerIndex: 1,
});
assert.equal(poisonPrepared.rounds[0].actions[0].battleStatusInput?.newStatus, "POISON");
poisonPrepared.rounds[0].actions[0].accuracyResolution = { hit: true };
const poisonCommit = commitBattleSystemsStatusRuntime({
  battleInput: poisonPrepared,
  turn: executedTurn,
  pokemon: poisonTarget,
  reflectedBattlerIndex: 1,
});
assert.equal(poisonCommit.pokemon.status, "POISON");

for (const types of [["POISON"], ["STEEL"]]) {
  const immune = pokemon({ types });
  const prepared = prepareReflectedMajorStatusBattleInput({
    battleInput: actionFor("POISONPOWDER"),
    pokemon: immune,
    reflectedBattlerIndex: 1,
  });
  assert.equal(prepared.rounds[0].actions[0].battleStatusInput, undefined);
  assert.equal(prepared.rounds[0].actions[0].majorStatusEffectResolution?.reason, "type_immunity");
}

const damagingSecondary = prepareReflectedMajorStatusBattleInput({
  battleInput: actionFor("THUNDERSHOCK", 100),
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
assert.equal(damagingSecondary.rounds[0].actions[0].battleStatusInput, undefined,
  "damaging ParalyzeTarget moves must remain secondary effects, not become guaranteed major-status moves");
assert.equal(damagingSecondary.rounds[0].actions[0].majorStatusEffectResolution, undefined);

console.log("ordinary Stun Spore / Poison Powder major status owner smoke: ok");

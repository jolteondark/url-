import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { commitBattleSystemsStatusRuntime } from "../runtime/battle-status-runtime-integration.js";
import { resolveOrdinaryPokemonSpeedCanonical } from "../runtime/battle-core-speed.js";

SAFARI_MOVE_MASTERS.THUNDERWAVE = Object.freeze({
  id: "THUNDERWAVE",
  name: "Thunder Wave",
  category: "Status",
  power: 0,
  accuracy: 90,
  total_pp: 20,
  priority: 0,
  type: "ELECTRIC",
  function_code: "ParalyzeTargetIfNotTypeImmune",
});

const pokemon = ({ species = "EEVEE", types = ["NORMAL"], status = "NONE", speed = 100 } = {}) => ({
  species,
  level: 20,
  hp: 50,
  max_hp: 50,
  status,
  status_count: 0,
  types,
  stats: { ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: speed },
  moves: [{ id: "THUNDERWAVE", pp: 20, ppup: 0 }],
});

const baseBattleInput = {
  rounds: [{ actions: [{
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveId: "THUNDERWAVE",
    accuracyInput: { baseAccuracy: 90, randomRoll: 0 },
  }] }],
};

const target = pokemon();
const prepared = prepareReflectedMajorStatusBattleInput({
  battleInput: baseBattleInput,
  pokemon: target,
  reflectedBattlerIndex: 1,
});
assert.equal(prepared.rounds[0].actions[0].battleStatusInput?.newStatus, "PARALYSIS");
assert.equal(prepared.rounds[0].actions[0].battleStatusInput?.targetBattlerIndex, 1);
assert.equal(prepared.rounds[0].actions[0].majorStatusEffectResolution?.canInflict, true);

const hitInput = structuredClone(prepared);
hitInput.rounds[0].actions[0].accuracyResolution = { hit: true };
const turn = { operations: [{ op: "use_move", round: 1, action: 0 }] };
const foeCommit = commitBattleSystemsStatusRuntime({ battleInput: hitInput, turn, pokemon: target, reflectedBattlerIndex: 1 });
assert.equal(foeCommit.pokemon.status, "PARALYSIS", "an executed, accurate Thunder Wave must persist paralysis on its target");
assert.equal(foeCommit.commits.length, 1);
assert.equal(resolveOrdinaryPokemonSpeedCanonical(foeCommit.pokemon), 50,
  "persisted paralysis must feed the existing canonical Speed owner on the next turn");

const actorCommit = commitBattleSystemsStatusRuntime({ battleInput: hitInput, turn, pokemon: pokemon(), reflectedBattlerIndex: 0 });
assert.equal(actorCommit.pokemon.status, "NONE", "targeted status must not leak onto the acting battler");
assert.equal(actorCommit.commits.length, 0);

const missInput = structuredClone(prepared);
missInput.rounds[0].actions[0].accuracyResolution = { hit: false };
const missCommit = commitBattleSystemsStatusRuntime({ battleInput: missInput, turn, pokemon: target, reflectedBattlerIndex: 1 });
assert.equal(missCommit.pokemon.status, "NONE", "a missed Thunder Wave must not inflict paralysis");

const ground = pokemon({ species: "SANDSHREW", types: ["GROUND"] });
const groundPrepared = prepareReflectedMajorStatusBattleInput({ battleInput: baseBattleInput, pokemon: ground, reflectedBattlerIndex: 1 });
assert.equal(groundPrepared.rounds[0].actions[0].battleStatusInput, undefined);
assert.equal(groundPrepared.rounds[0].actions[0].majorStatusEffectResolution?.reason, "move_type_immunity");

const electric = pokemon({ species: "PIKACHU", types: ["ELECTRIC"] });
const electricPrepared = prepareReflectedMajorStatusBattleInput({ battleInput: baseBattleInput, pokemon: electric, reflectedBattlerIndex: 1 });
assert.equal(electricPrepared.rounds[0].actions[0].battleStatusInput, undefined);
assert.equal(electricPrepared.rounds[0].actions[0].majorStatusEffectResolution?.reason, "type_immunity");

const ordinary = prepareReflectedMajorStatusBattleInput({
  battleInput: { rounds: [{ actions: [{ kind: "move", targetBattlerIndex: 1, moveId: "TACKLE" }] }] },
  pokemon: { species: "NOT_A_GENERAL_SPECIES", hp: 10, status: "NONE" },
  reflectedBattlerIndex: 1,
});
assert.equal(ordinary.rounds[0].actions[0].battleStatusInput, undefined,
  "ordinary non-status rounds must not force GENERAL type projection just because Battle status support is installed");

console.log("ordinary Thunder Wave status owner smoke: ok");

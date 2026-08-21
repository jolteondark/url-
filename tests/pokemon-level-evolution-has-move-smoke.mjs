import assert from "node:assert/strict";

import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const moveMasters = {
  AURASPHERE: { id: "AURASPHERE", type: "FIGHTING", total_pp: 20 },
  WATERPULSE: { id: "WATERPULSE", type: "WATER", total_pp: 20 },
  TACKLE: { id: "TACKLE", type: "NORMAL", total_pp: 35 },
};
const nature = { id: "HARDY", stat_changes: [] };

function species(id, evolutions = []) {
  return {
    id,
    name: id,
    form: 0,
    types: ["NORMAL"],
    growth_rate: "Medium",
    base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
    abilities: ["INNERFOCUS"],
    hidden_abilities: [],
    level_moves: [],
    evolutions,
  };
}

const speciesMasters = {
  MOVESOURCE: species("MOVESOURCE", [
    { species: "MOVETARGET", method: "HasMove", parameter: "AURASPHERE" },
    { species: "UNSUPPORTED", method: "Trade", parameter: null },
  ]),
  MOVETARGET: species("MOVETARGET"),
  TYPESOURCE: species("TYPESOURCE", [
    { species: "TYPETARGET", method: "HasMoveType", parameter: "WATER" },
  ]),
  TYPETARGET: species("TYPETARGET"),
  UNSUPPORTED: species("UNSUPPORTED"),
};

function materialize(speciesId, moves, personalId) {
  return resolvePokemonRuntimeMasters({
    species: speciesId,
    level: 25,
    exp: 15625,
    personal_id: personalId,
    nature_id: "HARDY",
    iv: zeroStats,
    ev: zeroStats,
    hp: 17,
    status: "POISON",
    status_count: 2,
    held_item: "SITRUSBERRY",
    ability_index: 0,
    moves,
  }, {
    species_master: speciesMasters[speciesId],
    nature_master: nature,
    move_masters: moveMasters,
  });
}

const hasMove = materialize("MOVESOURCE", [
  { id: "TACKLE", pp: 11, ppup: 0 },
  { id: "AURASPHERE", pp: 7, ppup: 0 },
], 10101);
const hasMoveResult = resolvePokemonLevelEvolution(hasMove, {
  species_masters: speciesMasters,
  nature_master: nature,
  move_masters: moveMasters,
});
assert.equal(hasMoveResult.evolved, true);
assert.deepEqual(hasMoveResult.evolution, {
  from: "MOVESOURCE",
  to: "MOVETARGET",
  method: "HasMove",
  parameter: "AURASPHERE",
});
assert.equal(hasMoveResult.pokemon.personal_id, 10101);
assert.equal(hasMoveResult.pokemon.held_item, "SITRUSBERRY");
assert.equal(hasMoveResult.pokemon.status, "POISON");
assert.equal(hasMoveResult.pokemon.status_count, 2);
assert.deepEqual(hasMoveResult.pokemon.moves.map(({ id, pp }) => ({ id, pp })), [
  { id: "TACKLE", pp: 11 },
  { id: "AURASPHERE", pp: 7 },
]);
assert.ok(hasMoveResult.unsupportedMethods.includes("Trade"));

const missingMove = materialize("MOVESOURCE", [{ id: "TACKLE", pp: 11, ppup: 0 }], 20202);
const missingMoveResult = resolvePokemonLevelEvolution(missingMove, {
  species_masters: speciesMasters,
  nature_master: nature,
  move_masters: moveMasters,
});
assert.equal(missingMoveResult.evolved, false);
assert.equal(missingMoveResult.levelEvolutionCandidate, null);
assert.deepEqual(missingMoveResult.unsupportedMethods, ["Trade"]);

const hasType = materialize("TYPESOURCE", [
  { id: "TACKLE", pp: 13, ppup: 0 },
  { id: "WATERPULSE", pp: 5, ppup: 0 },
], 30303);
const hasTypeResult = resolvePokemonLevelEvolution(hasType, {
  species_masters: speciesMasters,
  nature_master: nature,
  move_masters: moveMasters,
});
assert.equal(hasTypeResult.evolved, true);
assert.equal(hasTypeResult.evolution?.method, "HasMoveType");
assert.equal(hasTypeResult.evolution?.parameter, "WATER");
assert.equal(hasTypeResult.pokemon.personal_id, 30303);
assert.equal(hasTypeResult.pokemon.held_item, "SITRUSBERRY");
assert.deepEqual(hasTypeResult.pokemon.moves.map(({ id, pp }) => ({ id, pp })), [
  { id: "TACKLE", pp: 13 },
  { id: "WATERPULSE", pp: 5 },
]);

const wrongType = materialize("TYPESOURCE", [{ id: "AURASPHERE", pp: 9, ppup: 0 }], 40404);
const wrongTypeResult = resolvePokemonLevelEvolution(wrongType, {
  species_masters: speciesMasters,
  nature_master: nature,
  move_masters: moveMasters,
});
assert.equal(wrongTypeResult.evolved, false);
assert.equal(wrongTypeResult.levelEvolutionCandidate, null);

console.log("Pokemon HasMove/HasMoveType level-up evolution owner: PASS");

import assert from "node:assert/strict";
import { resolvePokemonAfterBattleEvolution } from "../runtime/pokemon-after-battle-evolution.js";

const nature_master = { id: "HARDY", stat_changes: [] };
const move_masters = { KEEP: { id: "KEEP", total_pp: 20 } };
const stats = { HP: 50, ATTACK: 60, DEFENSE: 60, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 60, SPEED: 60 };
const species_masters = {
  BASE: {
    id: "BASE", form: 0, growth_rate: "Medium", base_stats: stats,
    abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [],
    evolutions: [
      ["EVENTNEXT", "EventAfterDamageTaken", 7, false],
      ["ITEMALT", "Item", "MOONSTONE", false],
    ],
  },
  EVENTNEXT: { id: "EVENTNEXT", form: 0, growth_rate: "Medium", base_stats: stats, abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent", level_moves: [], evolutions: [] },
  ITEMALT: { id: "ITEMALT", form: 0, growth_rate: "Medium", base_stats: stats, abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent", level_moves: [], evolutions: [] },
};

function pokemon() {
  return {
    species: "BASE", form: 0, level: 20, exp: 8000,
    hp: 31, max_hp: 50, personal_id: 0x12345678,
    ability_index: 0, ability: "BASEABILITY", held_item: "LEFTOVERS",
    status: "POISON", status_count: 2,
    ready_to_evolve: false,
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
    steps_to_hatch: 0,
  };
}

const options = { species_masters, nature_master, move_masters };
const below = resolvePokemonAfterBattleEvolution(pokemon(), { ...options, direct_damage_taken: 48 });
assert.equal(below.evolved, false);
assert.equal(below.pokemon.ready_to_evolve, false);
assert.deepEqual(below.deferredEventEvolutionCandidate, { to: "EVENTNEXT", method: "EventAfterDamageTaken", parameter: 7 });
assert.deepEqual(below.operations, []);
assert.deepEqual(below.unsupportedMethods, ["EventAfterDamageTaken"], "actual event trigger remains explicitly unsupported");

const ready = resolvePokemonAfterBattleEvolution(pokemon(), { ...options, direct_damage_taken: 49 });
assert.equal(ready.evolved, false, "canonical after-battle hook only arms the event evolution");
assert.equal(ready.pokemon.species, "BASE", "after-battle direct damage must not immediately change species");
assert.equal(ready.pokemon.ready_to_evolve, true);
assert.equal(ready.pokemon.personal_id, 0x12345678);
assert.equal(ready.pokemon.held_item, "LEFTOVERS");
assert.equal(ready.pokemon.status, "POISON");
assert.equal(ready.pokemon.moves[0].pp, 7);
assert.deepEqual(ready.operations, [{
  op: "set_ready_to_evolve",
  method: "EventAfterDamageTaken",
  value: true,
  directDamageTaken: 49,
  threshold: 49,
}]);
assert.deepEqual(ready.unsupportedMethods, ["EventAfterDamageTaken"], "event_proc remains explicit until its owner is connected");

const alreadyReady = resolvePokemonAfterBattleEvolution({ ...pokemon(), ready_to_evolve: true }, { ...options, direct_damage_taken: 80 });
assert.equal(alreadyReady.pokemon.ready_to_evolve, true);
assert.deepEqual(alreadyReady.operations, [], "repeated battles must not duplicate the ready-state mutation");

console.log("canonical EventAfterDamageTaken after-battle ready state: PASS");

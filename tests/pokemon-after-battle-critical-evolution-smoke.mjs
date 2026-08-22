import assert from "node:assert/strict";
import { resolvePokemonAfterBattleEvolution } from "../runtime/pokemon-after-battle-evolution.js";

const nature_master = { id: "HARDY", stat_changes: [] };
const move_masters = {
  KEEP: { id: "KEEP", total_pp: 20 },
  EVOMOVE: { id: "EVOMOVE", total_pp: 15 },
};
const stats = (hp) => ({ HP: hp, ATTACK: 60, DEFENSE: 60, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 60, SPEED: 60 });
const species_masters = {
  BASE: {
    id: "BASE", form: 0, growth_rate: "Medium", base_stats: stats(50),
    abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [],
    evolutions: [
      ["EVOLVED", "BattleDealCriticalHit", 3, false],
      ["ITEMALT", "Item", "MOONSTONE", false],
    ],
  },
  EVOLVED: {
    id: "EVOLVED", form: 1, growth_rate: "Medium", base_stats: stats(80),
    abilities: ["EVOLVEDABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [[0, "EVOMOVE"]], evolutions: [],
  },
  ITEMALT: {
    id: "ITEMALT", form: 0, growth_rate: "Medium", base_stats: stats(55),
    abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [], evolutions: [],
  },
};

function pokemon() {
  return {
    species: "BASE", form: 0, level: 20, exp: 8000,
    hp: 40, max_hp: 50, personal_id: 0x12345678,
    ability_index: 0, ability: "BASEABILITY", held_item: "LEFTOVERS",
    status: "POISON", status_count: 2,
    nature_id: "HARDY", nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
    steps_to_hatch: 0,
  };
}

const options = { species_masters, nature_master, move_masters };
const below = resolvePokemonAfterBattleEvolution(pokemon(), { ...options, critical_hits_dealt: 2 });
assert.equal(below.evolved, false);
assert.deepEqual(below.afterBattleEvolutionCandidate, { to: "EVOLVED", method: "BattleDealCriticalHit", parameter: 3 });
assert.equal(below.pokemon.species, "BASE");

const result = resolvePokemonAfterBattleEvolution(pokemon(), { ...options, critical_hits_dealt: 3 });
assert.equal(result.evolved, true);
assert.deepEqual(result.evolution, { from: "BASE", to: "EVOLVED", method: "BattleDealCriticalHit", parameter: 3 });
assert.equal(result.pokemon.species, "EVOLVED");
assert.equal(result.pokemon.form, 1);
assert.equal(result.pokemon.personal_id, 0x12345678);
assert.equal(result.pokemon.held_item, "LEFTOVERS");
assert.equal(result.pokemon.status, "POISON");
assert.equal(result.pokemon.status_count, 2);
assert.equal(result.pokemon.moves[0].id, "KEEP");
assert.equal(result.pokemon.moves[0].pp, 7);
assert.equal(result.pokemon.moves[1].id, "EVOMOVE");
assert.equal(result.pokemon.moves[1].pp, 15);
assert.ok(result.pokemon.hp > 40, "max-HP growth should apply canonical current-HP delta");
assert.ok(result.pokemon.hp < result.pokemon.max_hp, "evolution must not full-heal a wounded Pokemon");
assert.ok(result.operations.some((operation) => operation.op === "level_evolution" && operation.method === "BattleDealCriticalHit"));

const blockedPokemon = { ...pokemon(), held_item: "EVERSTONE" };
const blocked = resolvePokemonAfterBattleEvolution(blockedPokemon, { ...options, critical_hits_dealt: 3 });
assert.equal(blocked.evolved, false);
assert.equal(blocked.evolutionBlockedBy, "EVERSTONE");
assert.deepEqual(blocked.pokemon, blockedPokemon);

console.log("canonical BattleDealCriticalHit after-battle evolution owner: PASS");

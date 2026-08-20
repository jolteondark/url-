import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const speciesMasters = {
  SOURCEFORM: {
    id: "SOURCEFORM", form: 3,
    base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    evolutions: [["TARGETFORM", "Level", 20]], level_moves: [[1, "TACKLE"]],
  },
  TARGETFORM: {
    id: "TARGETFORM", form: 2,
    base_stats: { HP: 70, ATTACK: 70, DEFENSE: 70, SPECIAL_ATTACK: 70, SPECIAL_DEFENSE: 70, SPEED: 70 },
    evolutions: [["SOURCEFORM", "Level", 20, true], ["STONEFORM", "Item", "MOONSTONE"]], level_moves: [[1, "TACKLE"]],
  },
};
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };
const before = {
  species: "SOURCEFORM", form: 3, forced_form: 3, level: 20, exp: 8000,
  hp: 19, max_hp: 30,
  stats: { ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
  iv: zeroStats,
  iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
  ev: zeroStats,
  moves: [{ id: "TACKLE", pp: 4, ppup: 0 }],
  personal_id: 987654321, gender: 0,
  nature_id: null, nature_for_stats_id: null,
  ability_id: "LEGACYABILITY", ability_index: 1, ability: "AUTHORITATIVEABILITY",
  item: "LEGACYITEM", held_item: "AUTHORITATIVEITEM",
  status: "POISON", status_count: 2,
};

const resolved = resolvePokemonLevelEvolution(before, { species_masters: speciesMasters, move_masters: moveMasters });
assert.equal(resolved.evolved, true);
assert.equal(resolved.pokemon.species, "TARGETFORM");
assert.equal(resolved.pokemon.form, 2, "evolution must use the target species/form master");
assert.equal(resolved.pokemon.forced_form, null, "canonical species change must clear a stale forced form");
assert.equal(resolved.pokemon.personal_id, before.personal_id);
assert.equal(resolved.pokemon.ability_index, 1);
assert.equal(resolved.pokemon.ability, "AUTHORITATIVEABILITY");
assert.equal(resolved.pokemon.held_item, "AUTHORITATIVEITEM");
assert.equal(resolved.pokemon.status, "POISON");
assert.equal(resolved.pokemon.status_count, 2);
assert.equal(resolved.pokemon.moves[0].pp, 4);
assert.ok(resolved.pokemon.max_hp > before.max_hp);
assert.equal(resolved.pokemon.hp, before.hp + (resolved.pokemon.max_hp - before.max_hp));
assert.deepEqual(resolved.unsupportedMethods, ["Item"]);
console.log("pokemon-level-evolution forced-form reset smoke: PASS");

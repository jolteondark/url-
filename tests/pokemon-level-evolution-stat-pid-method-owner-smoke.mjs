import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const stats = (hp, attack, defense, specialAttack, specialDefense, speed) => ({
  HP: hp,
  ATTACK: attack,
  DEFENSE: defense,
  SPECIAL_ATTACK: specialAttack,
  SPECIAL_DEFENSE: specialDefense,
  SPEED: speed,
});

const baseStats = stats(40, 40, 40, 40, 40, 40);
const targetStats = stats(50, 55, 45, 50, 50, 50);
const speciesMasters = {
  STAT_BASE: {
    id: "STAT_BASE",
    form: 0,
    base_stats: baseStats,
    evolutions: [
      ["ATTACK_EVOLVED", "AttackGreater", 20, false],
      ["EQUAL_EVOLVED", "AtkDefEqual", 20, false],
      ["DEFENSE_EVOLVED", "DefenseGreater", 20, false],
      ["ITEM_EVOLVED", "Item", "MOONSTONE", false],
    ],
    level_moves: [[1, "TACKLE"]],
  },
  PID_BASE: {
    id: "PID_BASE",
    form: 0,
    base_stats: baseStats,
    evolutions: [
      ["SILCOON_EVOLVED", "Silcoon", 7, false],
      ["CASCOON_EVOLVED", "Cascoon", 7, false],
      ["TRADE_EVOLVED", "Trade", null, false],
    ],
    level_moves: [[1, "TACKLE"]],
  },
  ATTACK_EVOLVED: { id: "ATTACK_EVOLVED", form: 0, base_stats: targetStats, evolutions: [], level_moves: [] },
  EQUAL_EVOLVED: { id: "EQUAL_EVOLVED", form: 0, base_stats: targetStats, evolutions: [], level_moves: [] },
  DEFENSE_EVOLVED: { id: "DEFENSE_EVOLVED", form: 0, base_stats: targetStats, evolutions: [], level_moves: [] },
  SILCOON_EVOLVED: { id: "SILCOON_EVOLVED", form: 0, base_stats: targetStats, evolutions: [], level_moves: [] },
  CASCOON_EVOLVED: { id: "CASCOON_EVOLVED", form: 0, base_stats: targetStats, evolutions: [], level_moves: [] },
};

const moveMasters = {
  TACKLE: { id: "TACKLE", total_pp: 35 },
};

function runtime(species, { attack = 40, defense = 40, personalId = 0x0003007B, level = 20 } = {}) {
  return {
    species,
    form: 0,
    level,
    exp: level ** 3,
    hp: 23,
    max_hp: 40,
    stats: {
      ATTACK: attack,
      DEFENSE: defense,
      SPECIAL_ATTACK: 40,
      SPECIAL_DEFENSE: 40,
      SPEED: 40,
    },
    iv: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "TACKLE", pp: 7, ppup: 0 }],
    personal_id: personalId,
    gender: 0,
    nature_id: null,
    nature_for_stats_id: null,
    ability: "KEEPABILITY",
    ability_id: "STALEABILITY",
    held_item: "KEEPITEM",
    item: "STALEITEM",
    status: "POISON",
    status_count: 2,
    steps_to_hatch: 0,
  };
}

for (const [attack, defense, expectedSpecies, expectedMethod] of [
  [51, 40, "ATTACK_EVOLVED", "AttackGreater"],
  [40, 40, "EQUAL_EVOLVED", "AtkDefEqual"],
  [35, 40, "DEFENSE_EVOLVED", "DefenseGreater"],
]) {
  const result = resolvePokemonLevelEvolution(runtime("STAT_BASE", { attack, defense }), {
    species_masters: speciesMasters,
    move_masters: moveMasters,
  });
  assert.equal(result.evolved, true);
  assert.equal(result.evolution.method, expectedMethod);
  assert.equal(result.pokemon.species, expectedSpecies);
  assert.deepEqual(result.unsupportedMethods, ["Item"]);
  assert.equal(result.pokemon.personal_id, 0x0003007B);
  assert.equal(result.pokemon.held_item, "KEEPITEM");
  assert.equal(result.pokemon.status, "POISON");
  assert.equal(result.pokemon.status_count, 2);
  assert.equal(result.pokemon.moves[0].pp, 7);
}

const silcoon = resolvePokemonLevelEvolution(runtime("PID_BASE", {
  personalId: (3 << 16) | 123,
  level: 7,
}), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(silcoon.evolved, true);
assert.equal(silcoon.evolution.method, "Silcoon");
assert.equal(silcoon.pokemon.species, "SILCOON_EVOLVED");
assert.deepEqual(silcoon.unsupportedMethods, ["Trade"]);
assert.equal(silcoon.pokemon.personal_id, (3 << 16) | 123);
assert.equal(silcoon.pokemon.held_item, "KEEPITEM");
assert.equal(silcoon.pokemon.moves[0].pp, 7);

const cascoon = resolvePokemonLevelEvolution(runtime("PID_BASE", {
  personalId: (7 << 16) | 123,
  level: 7,
}), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(cascoon.evolved, true);
assert.equal(cascoon.evolution.method, "Cascoon");
assert.equal(cascoon.pokemon.species, "CASCOON_EVOLVED");
assert.deepEqual(cascoon.unsupportedMethods, ["Trade"]);
assert.equal(cascoon.pokemon.personal_id, (7 << 16) | 123);
assert.equal(cascoon.pokemon.held_item, "KEEPITEM");
assert.equal(cascoon.pokemon.moves[0].pp, 7);

const tooLow = resolvePokemonLevelEvolution(runtime("PID_BASE", {
  personalId: (3 << 16) | 123,
  level: 6,
}), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(tooLow.evolved, false);
assert.equal(tooLow.levelEvolutionCandidate, null);
assert.deepEqual(tooLow.unsupportedMethods, ["Trade"]);

console.log("generic stat/PID level evolution owner: PASS");
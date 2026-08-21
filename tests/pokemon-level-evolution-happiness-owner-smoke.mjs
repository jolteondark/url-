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

const base = {
  form: 0,
  base_stats: stats(40, 50, 40, 50, 40, 60),
  level_moves: [],
  evolutions: [],
};

const speciesMasters = {
  HAPPY: {
    ...base,
    id: "HAPPY",
    evolutions: [
      ["HAPPY2", "Happiness", null, false],
      ["DAY2", "HappinessDay", null, false],
    ],
  },
  HAPPY2: { ...base, id: "HAPPY2", base_stats: stats(60, 70, 60, 70, 60, 80) },
  MALE: { ...base, id: "MALE", evolutions: [["MALE2", "HappinessMale", null, false]] },
  MALE2: { ...base, id: "MALE2" },
  FEMALE: { ...base, id: "FEMALE", evolutions: [["FEMALE2", "HappinessFemale", null, false]] },
  FEMALE2: { ...base, id: "FEMALE2" },
  MAX: { ...base, id: "MAX", evolutions: [["MAX2", "MaxHappiness", null, false]] },
  MAX2: { ...base, id: "MAX2" },
};

function runtime(species, happiness, gender = 0) {
  return {
    species,
    form: 0,
    level: 20,
    exp: 8000,
    hp: 23,
    max_hp: 40,
    stats: stats(40, 50, 40, 50, 40, 60),
    iv: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "TACKLE", pp: 17, ppup: 0 }],
    personal_id: 0x12345678,
    gender,
    happiness,
    nature_id: null,
    nature_for_stats_id: null,
    ability: "RUNAWAY",
    ability_id: "RUNAWAY",
    held_item: "ORANBERRY",
    item: "ORANBERRY",
    status: "POISON",
    status_count: 2,
    steps_to_hatch: 0,
  };
}

const options = {
  species_masters: speciesMasters,
  move_masters: { TACKLE: { id: "TACKLE", total_pp: 35 } },
};

{
  const low = resolvePokemonLevelEvolution(runtime("HAPPY", 219), options);
  assert.equal(low.evolved, false);
  assert.equal(low.levelEvolutionCandidate, null);
  assert.deepEqual(low.unsupportedMethods, ["HappinessDay"]);
}

{
  const evolved = resolvePokemonLevelEvolution(runtime("HAPPY", 220), options);
  assert.equal(evolved.evolved, true);
  assert.equal(evolved.evolution.method, "Happiness");
  assert.equal(evolved.evolution.parameter, null);
  assert.equal(evolved.pokemon.species, "HAPPY2");
  assert.equal(evolved.pokemon.personal_id, 0x12345678);
  assert.equal(evolved.pokemon.held_item, "ORANBERRY");
  assert.equal(evolved.pokemon.status, "POISON");
  assert.equal(evolved.pokemon.moves[0].pp, 17);
  assert.deepEqual(evolved.unsupportedMethods, ["HappinessDay"]);
}

{
  assert.equal(resolvePokemonLevelEvolution(runtime("MALE", 220, 0), options).evolved, true);
  assert.equal(resolvePokemonLevelEvolution(runtime("MALE", 220, 1), options).evolved, false);
  assert.equal(resolvePokemonLevelEvolution(runtime("FEMALE", 220, 1), options).evolved, true);
  assert.equal(resolvePokemonLevelEvolution(runtime("FEMALE", 220, 0), options).evolved, false);
}

{
  assert.equal(resolvePokemonLevelEvolution(runtime("MAX", 254), options).evolved, false);
  const maxed = resolvePokemonLevelEvolution(runtime("MAX", 255), options);
  assert.equal(maxed.evolved, true);
  assert.equal(maxed.evolution.method, "MaxHappiness");
}

console.log("canonical happiness level-up evolution owner: PASS");

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
  HOLD: {
    ...base,
    id: "HOLD",
    evolutions: [
      ["HOLD2", "HappinessHoldItem", "SOOTHEBELL", false],
      ["HOLDITEM2", "Item", "MOONSTONE", false],
    ],
  },
  HOLD2: { ...base, id: "HOLD2", base_stats: stats(55, 65, 55, 65, 55, 75) },
  ITEMHOLD: { ...base, id: "ITEMHOLD", evolutions: [["ITEMHOLD2", "HoldItem", "RAZORCLAW", false], ["TRADE2", "Trade", null, false]] },
  ITEMHOLD2: { ...base, id: "ITEMHOLD2" },
  ITEMMALE: { ...base, id: "ITEMMALE", evolutions: [["ITEMMALE2", "HoldItemMale", "RAZORFANG", false]] },
  ITEMMALE2: { ...base, id: "ITEMMALE2" },
  ITEMFEMALE: { ...base, id: "ITEMFEMALE", evolutions: [["ITEMFEMALE2", "HoldItemFemale", "OVALSTONE", false]] },
  ITEMFEMALE2: { ...base, id: "ITEMFEMALE2" },
};

function runtime(species, happiness, gender = 0, heldItem = "ORANBERRY") {
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
    held_item: heldItem,
    item: heldItem,
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

{
  const low = resolvePokemonLevelEvolution(runtime("HOLD", 219, 0, "SOOTHEBELL"), options);
  assert.equal(low.evolved, false, "matching held item must not bypass the happiness threshold");
  assert.equal(low.pokemon.held_item, "SOOTHEBELL", "failed eligibility must not consume the held item");
  assert.deepEqual(low.unsupportedMethods, ["Item"]);

  const wrongItem = resolvePokemonLevelEvolution(runtime("HOLD", 220, 0, "ORANBERRY"), options);
  assert.equal(wrongItem.evolved, false, "happiness alone must not satisfy HappinessHoldItem");
  assert.equal(wrongItem.pokemon.held_item, "ORANBERRY", "wrong held item must be retained");

  const candidate = runtime("HOLD", 220, 0, "SOOTHEBELL");
  candidate.item = "ORANBERRY";
  const evolved = resolvePokemonLevelEvolution(candidate, options);
  assert.equal(evolved.evolved, true);
  assert.equal(evolved.evolution.method, "HappinessHoldItem");
  assert.equal(evolved.evolution.parameter, "SOOTHEBELL");
  assert.equal(evolved.pokemon.species, "HOLD2");
  assert.equal(evolved.pokemon.held_item, null, "successful canonical HappinessHoldItem evolution consumes the authoritative held item");
  assert.equal(evolved.pokemon.item, null, "legacy item alias must not resurrect the consumed evolution item");
  assert.equal(evolved.pokemon.personal_id, 0x12345678);
  assert.equal(evolved.pokemon.status, "POISON");
  assert.equal(evolved.pokemon.status_count, 2);
  assert.equal(evolved.pokemon.moves[0].pp, 17, "existing move PP must survive the evolution");
  assert.ok(evolved.operations.some((operation) => operation.op === "consume_evolution_item" && operation.item === "SOOTHEBELL"));
  assert.deepEqual(evolved.unsupportedMethods, ["Item"]);
}

{
  const wrong = resolvePokemonLevelEvolution(runtime("ITEMHOLD", 0, 0, "ORANBERRY"), options);
  assert.equal(wrong.evolved, false, "HoldItem must require the configured item");
  assert.equal(wrong.pokemon.held_item, "ORANBERRY");
  assert.deepEqual(wrong.unsupportedMethods, ["Trade"]);

  const candidate = runtime("ITEMHOLD", 0, 0, "RAZORCLAW");
  candidate.item = "ORANBERRY";
  const evolved = resolvePokemonLevelEvolution(candidate, options);
  assert.equal(evolved.evolved, true);
  assert.equal(evolved.evolution.method, "HoldItem");
  assert.equal(evolved.pokemon.species, "ITEMHOLD2");
  assert.equal(evolved.pokemon.held_item, null, "successful HoldItem evolution consumes the authoritative item");
  assert.equal(evolved.pokemon.item, null);
  assert.equal(evolved.pokemon.personal_id, 0x12345678);
  assert.equal(evolved.pokemon.status, "POISON");
  assert.equal(evolved.pokemon.status_count, 2);
  assert.equal(evolved.pokemon.moves[0].pp, 17);
  assert.ok(evolved.operations.some((operation) => operation.op === "consume_evolution_item" && operation.item === "RAZORCLAW"));
  assert.deepEqual(evolved.unsupportedMethods, ["Trade"]);
}

{
  const male = resolvePokemonLevelEvolution(runtime("ITEMMALE", 0, 0, "RAZORFANG"), options);
  assert.equal(male.evolved, true);
  assert.equal(male.evolution.method, "HoldItemMale");
  assert.equal(male.pokemon.held_item, null);
  assert.equal(resolvePokemonLevelEvolution(runtime("ITEMMALE", 0, 1, "RAZORFANG"), options).evolved, false);

  const female = resolvePokemonLevelEvolution(runtime("ITEMFEMALE", 0, 1, "OVALSTONE"), options);
  assert.equal(female.evolved, true);
  assert.equal(female.evolution.method, "HoldItemFemale");
  assert.equal(female.pokemon.held_item, null);
  assert.equal(resolvePokemonLevelEvolution(runtime("ITEMFEMALE", 0, 0, "OVALSTONE"), options).evolved, false);
}

console.log("canonical happiness/held-item level-up evolution owner: PASS");

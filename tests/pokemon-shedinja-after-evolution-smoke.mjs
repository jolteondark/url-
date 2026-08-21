import assert from "node:assert/strict";
import { applyShedinjaAfterEvolution } from "../runtime/pokemon-shedinja-after-evolution.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const natureMaster = { id: "HARDY", stat_changes: [] };
const moveMasters = {
  SCRATCH: { id: "SCRATCH", total_pp: 35 },
};
const speciesMasters = {
  NINCADA: {
    id: "NINCADA",
    form: 0,
    growth_rate: "Erratic",
    base_stats: { HP: 31, ATTACK: 45, DEFENSE: 90, SPECIAL_ATTACK: 30, SPECIAL_DEFENSE: 30, SPEED: 40 },
    abilities: ["COMPOUNDEYES"], hidden_abilities: ["RUNAWAY"],
    gender_ratio: "Female50Percent",
    evolutions: [
      ["NINJASK", "Ninjask", 20, false],
      ["SHEDINJA", "Shedinja", 20, false],
    ],
  },
  SHEDINJA: {
    id: "SHEDINJA",
    form: 0,
    growth_rate: "Erratic",
    base_stats: { HP: 1, ATTACK: 90, DEFENSE: 45, SPECIAL_ATTACK: 30, SPECIAL_DEFENSE: 30, SPEED: 40 },
    abilities: ["WONDERGUARD"], hidden_abilities: [],
    gender_ratio: "Genderless",
    evolutions: [],
  },
};

function sourcePokemon() {
  return {
    species: "NINCADA",
    nickname: "NIN",
    form: 0,
    forced_form: 3,
    level: 20,
    exp: 12800,
    hp: 7,
    max_hp: 42,
    stats: { ATTACK: 25, DEFENSE: 42, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 24 },
    personal_id: 123456789,
    gender: 1,
    nature_id: "HARDY",
    nature_for_stats_id: "HARDY",
    ability_index: 0,
    ability: "COMPOUNDEYES",
    ability_id: "COMPOUNDEYES",
    item: "ORANBERRY",
    held_item: "ORANBERRY",
    status: "POISON",
    status_count: 2,
    iv: zeroStats,
    iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
    ev: zeroStats,
    moves: [{ id: "SCRATCH", pp: 3, ppup: 0 }],
    poke_ball: "GREATBALL",
    markings: [1, 2],
    ribbons: ["COOLRIBBON"],
  };
}

const source = sourcePokemon();
const primaryEvolution = { ...source, species: "NINJASK" };
const party = [primaryEvolution];
const bagSlots = [["POKEBALL", 2], ["POTION", 1]];
const duplicated = applyShedinjaAfterEvolution({
  sourcePokemon: source,
  sourceSpeciesMaster: speciesMasters.NINCADA,
  speciesMasters,
  natureMaster,
  moveMasters,
  party,
  bagSlots,
});

assert.equal(duplicated.duplicated, true);
assert.equal(party.length, 2);
assert.equal(bagSlots[0][0], "POKEBALL");
assert.equal(bagSlots[0][1], 1, "one ordinary Poke Ball must be consumed");
const shedinja = party[1];
assert.equal(shedinja.species, "SHEDINJA");
assert.equal(shedinja.personal_id, source.personal_id, "canonical clone keeps the individual identity");
assert.equal(shedinja.nickname, null, "canonical duplicate clears the source nickname");
assert.equal(shedinja.form, 0);
assert.equal(shedinja.forced_form, null);
assert.equal(shedinja.gender, 2);
assert.equal(shedinja.ability, "WONDERGUARD");
assert.equal(shedinja.ability_id, "WONDERGUARD");
assert.equal(shedinja.item, null);
assert.equal(shedinja.held_item, null);
assert.equal(shedinja.poke_ball, "POKEBALL");
assert.deepEqual(shedinja.markings, []);
assert.deepEqual(shedinja.ribbons, []);
assert.equal(shedinja.max_hp, 1);
assert.equal(shedinja.hp, 1, "duplicate is healed after recalculation");
assert.equal(shedinja.status, null);
assert.equal(shedinja.status_count, 0);
assert.equal(shedinja.moves[0].id, "SCRATCH");
assert.equal(shedinja.moves[0].pp, 35, "canonical duplicate heal restores PP on the new Shedinja only");
assert.ok(duplicated.operations.some((operation) => operation.op === "shedinja_duplicate"));
assert.ok(duplicated.operations.some((operation) => operation.op === "remove_item" && operation.item === "POKEBALL"));

const fullParty = Array.from({ length: 6 }, (_, index) => ({ species: `P${index}` }));
const fullBag = [["POKEBALL", 2]];
const blockedFull = applyShedinjaAfterEvolution({
  sourcePokemon: source,
  sourceSpeciesMaster: speciesMasters.NINCADA,
  speciesMasters,
  natureMaster,
  moveMasters,
  party: fullParty,
  bagSlots: fullBag,
});
assert.equal(blockedFull.duplicated, false);
assert.equal(fullParty.length, 6);
assert.equal(fullBag[0][1], 2, "full party must not consume a Poke Ball");

const noBallParty = [primaryEvolution];
const noBallBag = [["POTION", 1]];
const blockedNoBall = applyShedinjaAfterEvolution({
  sourcePokemon: source,
  sourceSpeciesMaster: speciesMasters.NINCADA,
  speciesMasters,
  natureMaster,
  moveMasters,
  party: noBallParty,
  bagSlots: noBallBag,
});
assert.equal(blockedNoBall.duplicated, false);
assert.equal(noBallParty.length, 1);
assert.deepEqual(noBallBag, [["POTION", 1]]);

console.log("pokemon Shedinja after-evolution smoke: PASS");

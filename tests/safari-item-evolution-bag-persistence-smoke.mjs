import assert from "node:assert/strict";

import { resolvePokemonItemEvolutionBagTransaction } from "../runtime/pokemon-item-evolution-bag-transaction.js";
import {
  createSafariPlayableRuntime,
  hasSafariPlayableRun,
  loadSafariPlayableRun,
  saveSafariPlayableRun,
} from "../runtime/safari-web-startup.js";

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const stats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const speciesMasters = {
  BASE: {
    id: "BASE",
    form: 0,
    base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    abilities: ["KEEPABILITY"],
    hidden_abilities: [],
    gender_ratio: "Female50Percent",
    evolutions: [["EVOLVED", "Item", "MOONSTONE", false]],
    level_moves: [[1, "TACKLE"]],
  },
  EVOLVED: {
    id: "EVOLVED",
    form: 0,
    base_stats: { HP: 60, ATTACK: 60, DEFENSE: 55, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 55, SPEED: 50 },
    abilities: ["KEEPABILITY"],
    hidden_abilities: [],
    gender_ratio: "Female50Percent",
    evolutions: [["BASE", "Item", "MOONSTONE", true]],
    level_moves: [],
  },
};
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };
const pokemon = {
  species: "BASE",
  form: 0,
  level: 20,
  exp: 8000,
  hp: 23,
  max_hp: 40,
  stats: { ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  personal_id: 424242,
  gender: 0,
  nature_id: null,
  nature_for_stats_id: null,
  ability_index: 0,
  ability: "KEEPABILITY",
  ability_id: "KEEPABILITY",
  item: "KEEPITEM",
  held_item: "KEEPITEM",
  status: "POISON",
  status_count: 2,
  steps_to_hatch: 0,
  iv: structuredClone(stats),
  iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
  ev: structuredClone(stats),
  moves: [{ id: "TACKLE", pp: 7, ppup: 0 }],
};

const runtime = createSafariPlayableRuntime();
runtime.player.party = [structuredClone(pokemon)];
runtime.bag.slots = [["MOONSTONE", 2], ["POTION", 1]];

const wrong = resolvePokemonItemEvolutionBagTransaction(runtime.player.party[0], "SUNSTONE", {
  bagSlots: runtime.bag.slots,
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(wrong.evolved, false);
assert.equal(wrong.consumedCount, 0);
assert.deepEqual(wrong.bagSlots, runtime.bag.slots, "failed/non-owned use must not mutate the Bag");
assert.equal(runtime.player.party[0].species, "BASE");

const evolved = resolvePokemonItemEvolutionBagTransaction(runtime.player.party[0], ":MOONSTONE", {
  bagSlots: runtime.bag.slots,
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(evolved.evolved, true);
assert.equal(evolved.consumedCount, 1, "successful Item evolution must consume exactly one stone");
assert.deepEqual(evolved.bagSlots, [["MOONSTONE", 1], ["POTION", 1]]);
assert.equal(evolved.pokemon.species, "EVOLVED");
assert.equal(evolved.pokemon.personal_id, 424242);
assert.equal(evolved.pokemon.held_item, "KEEPITEM", "Bag evolution item must not delete the held item");
assert.equal(evolved.pokemon.status, "POISON");
assert.equal(evolved.pokemon.status_count, 2);
assert.equal(evolved.pokemon.moves[0].pp, 7, "existing PP must not be restored by evolution");
assert.equal(evolved.pokemon.hp, pokemon.hp + (evolved.pokemon.max_hp - pokemon.max_hp), "current HP must follow canonical max-HP delta continuity");

runtime.player.party[0] = evolved.pokemon;
runtime.bag.slots = evolved.bagSlots;
const evolvedBeforeSave = structuredClone(runtime.player.party[0]);
const bagBeforeSave = structuredClone(runtime.bag.slots);

const storage = new MemoryStorage();
const saved = saveSafariPlayableRun(storage, runtime);
assert.ok(saved.payload);
assert.equal(hasSafariPlayableRun(storage), true);

const freshRuntime = createSafariPlayableRuntime();
const loaded = loadSafariPlayableRun(storage, freshRuntime);
assert.equal(loaded.found, true);
assert.deepEqual(loaded.state.player.party[0], evolvedBeforeSave,
  "fresh Continue must preserve Item-evolved Pokemon identity/state exactly");
assert.deepEqual(loaded.state.bag.slots, bagBeforeSave,
  "fresh Continue must preserve the exactly-once stone consumption");

const storageAgain = new MemoryStorage();
saveSafariPlayableRun(storageAgain, loaded.state);
const secondFresh = createSafariPlayableRuntime();
const reloaded = loadSafariPlayableRun(storageAgain, secondFresh);
assert.deepEqual(reloaded.state.player.party, loaded.state.player.party,
  "repeated Continue must not re-run Item evolution");
assert.deepEqual(reloaded.state.bag.slots, loaded.state.bag.slots,
  "repeated Continue must not consume or restore another stone");

const blockedRuntime = createSafariPlayableRuntime();
blockedRuntime.player.party = [{ ...structuredClone(pokemon), held_item: "EVERSTONE" }];
blockedRuntime.bag.slots = [["MOONSTONE", 2]];
const blocked = resolvePokemonItemEvolutionBagTransaction(blockedRuntime.player.party[0], "MOONSTONE", {
  bagSlots: blockedRuntime.bag.slots,
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(blocked.evolved, false);
assert.equal(blocked.consumedCount, 0);
assert.deepEqual(blocked.bagSlots, [["MOONSTONE", 2]], "blocked evolution must retain the stone");

console.log("Safari Item/Stone Bag use -> evolution -> exactly-once consume -> browser Continue: PASS");

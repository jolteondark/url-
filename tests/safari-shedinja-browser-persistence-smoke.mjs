import assert from "node:assert/strict";

import { applyShedinjaAfterEvolution } from "../runtime/pokemon-shedinja-after-evolution.js";
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

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const natureMaster = { id: "HARDY", stat_changes: [] };
const moveMasters = { SCRATCH: { id: "SCRATCH", total_pp: 35 } };
const speciesMasters = {
  NINCADA: {
    id: "NINCADA",
    form: 0,
    growth_rate: "Medium",
    base_stats: { HP: 31, ATTACK: 45, DEFENSE: 90, SPECIAL_ATTACK: 30, SPECIAL_DEFENSE: 30, SPEED: 40 },
    abilities: ["COMPOUNDEYES"],
    hidden_abilities: ["RUNAWAY"],
    gender_ratio: "Female50Percent",
    evolutions: [
      ["NINJASK", "Ninjask", 20, false],
      ["SHEDINJA", "Shedinja", 20, false],
    ],
  },
  SHEDINJA: {
    id: "SHEDINJA",
    form: 0,
    growth_rate: "Medium",
    base_stats: { HP: 1, ATTACK: 90, DEFENSE: 45, SPECIAL_ATTACK: 30, SPECIAL_DEFENSE: 30, SPEED: 40 },
    abilities: ["WONDERGUARD"],
    hidden_abilities: [],
    gender_ratio: "Genderless",
    evolutions: [],
  },
};

const preEvolution = {
  species: "NINCADA",
  nickname: "NIN",
  form: 0,
  forced_form: 3,
  level: 20,
  exp: 8000,
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
const evolvedPrimary = { ...structuredClone(preEvolution), species: "NINJASK", forced_form: null };

const runtime = createSafariPlayableRuntime();
runtime.player.party = [evolvedPrimary];
runtime.bag.slots = [["POKEBALL", 2], ["POTION", 1]];
runtime.variables.mapless.battle = null;
runtime.variables.mapless.location = "day_board";

const duplicated = applyShedinjaAfterEvolution({
  sourcePokemon: preEvolution,
  sourceSpeciesMaster: speciesMasters.NINCADA,
  speciesMasters,
  natureMaster,
  moveMasters,
  party: runtime.player.party,
  bagSlots: runtime.bag.slots,
});
assert.equal(duplicated.duplicated, true);
assert.equal(runtime.player.party.length, 2, "Shedinja hook must append exactly one party member");
assert.equal(runtime.bag.slots[0][0], "POKEBALL");
assert.equal(runtime.bag.slots[0][1], 1, "Shedinja hook must consume exactly one Poké Ball");

const ninjaskBeforeSave = structuredClone(runtime.player.party[0]);
const shedinjaBeforeSave = structuredClone(runtime.player.party[1]);
assert.equal(shedinjaBeforeSave.species, "SHEDINJA");
assert.equal(shedinjaBeforeSave.personal_id, preEvolution.personal_id, "canonical clone identity must be retained");
assert.equal(shedinjaBeforeSave.ability, "WONDERGUARD");
assert.equal(shedinjaBeforeSave.held_item, null);
assert.equal(shedinjaBeforeSave.status, null);
assert.equal(shedinjaBeforeSave.hp, shedinjaBeforeSave.max_hp);
assert.equal(shedinjaBeforeSave.moves[0].pp, 35, "Shedinja clone must receive healed move PP");

const storage = new MemoryStorage();
const saved = saveSafariPlayableRun(storage, runtime);
assert.ok(saved.payload, "browser persistence owner must emit a save payload");
assert.equal(hasSafariPlayableRun(storage), true);

const freshRuntime = createSafariPlayableRuntime();
const loaded = loadSafariPlayableRun(storage, freshRuntime);
assert.equal(loaded.found, true, "fresh Continue must find the persisted run");
assert.equal(loaded.state.player.party.length, 2, "fresh Continue must not lose or duplicate Shedinja");
assert.deepEqual(loaded.state.player.party[0], ninjaskBeforeSave,
  "fresh Continue must preserve the evolved Ninjask exactly");
assert.deepEqual(loaded.state.player.party[1], shedinjaBeforeSave,
  "fresh Continue must preserve the generated Shedinja exactly");
assert.equal(loaded.state.bag.slots[0][0], "POKEBALL");
assert.equal(loaded.state.bag.slots[0][1], 1,
  "fresh Continue must preserve the one-time Poké Ball consumption");

const storageAgain = new MemoryStorage();
saveSafariPlayableRun(storageAgain, loaded.state);
const secondFresh = createSafariPlayableRuntime();
const reloaded = loadSafariPlayableRun(storageAgain, secondFresh);
assert.equal(reloaded.state.player.party.length, 2,
  "a second Save/Continue cycle must not synthesize another Shedinja");
assert.deepEqual(reloaded.state.player.party, loaded.state.player.party,
  "Shedinja/Ninjask identity and runtime state must remain stable across repeated Continue cycles");
assert.deepEqual(reloaded.state.bag.slots, loaded.state.bag.slots,
  "repeated Continue must not consume another Poké Ball");

console.log("Shedinja after-evolution -> browser Save -> fresh Continue identity/state continuity: PASS");

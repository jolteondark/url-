import assert from "node:assert/strict";

import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import { commitSafariNormalLevelEvolutionRewardGrowth } from "../runtime/safari-normal-battle-finalize.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";
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
const base = {
  id: "CRITBASE", form: 0, types: ["FIGHTING"], growth_rate: "Medium", base_exp: 80, catch_rate: 255,
  base_stats: { HP: 50, ATTACK: 70, DEFENSE: 55, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 50, SPEED: 60 },
  abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
  level_moves: [], evolutions: [["CRITEVOLVED", "BattleDealCriticalHit", 3, false]],
};
const evolved = {
  id: "CRITEVOLVED", form: 1, types: ["FIGHTING"], growth_rate: "Medium", base_exp: 120, catch_rate: 255,
  base_stats: { HP: 80, ATTACK: 105, DEFENSE: 75, SPECIAL_ATTACK: 55, SPECIAL_DEFENSE: 70, SPEED: 80 },
  abilities: ["EVOLVEDABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
  level_moves: [[0, "CRITEVOMOVE"]], evolutions: [],
};
const both = {
  id: "BOTHBASE", form: 0, types: ["NORMAL"], growth_rate: "Medium", base_exp: 80, catch_rate: 255,
  base_stats: base.base_stats, abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
  level_moves: [], evolutions: [
    ["LEVELNEXT", "Level", 20, false],
    ["CRITNEXT", "BattleDealCriticalHit", 1, false],
  ],
};
const levelNext = { ...evolved, id: "LEVELNEXT", form: 0, level_moves: [], evolutions: [] };
const critNext = { ...evolved, id: "CRITNEXT", form: 0, level_moves: [], evolutions: [] };
Object.assign(SAFARI_SPECIES_MASTERS, {
  CRITBASE: base,
  CRITEVOLVED: evolved,
  BOTHBASE: both,
  LEVELNEXT: levelNext,
  CRITNEXT: critNext,
});
Object.assign(SAFARI_MOVE_MASTERS, {
  CRITKEEP: { id: "CRITKEEP", name: "Crit Keep", category: "Physical", power: 40, accuracy: 100, total_pp: 20, priority: 0, type: "FIGHTING", thaws_user: false },
  CRITEVOMOVE: { id: "CRITEVOMOVE", name: "Crit Evo Move", category: "Status", power: 0, accuracy: 100, total_pp: 15, priority: 0, type: "FIGHTING", thaws_user: false },
});

function materialize(speciesMaster, personalId = 987654321) {
  const pokemon = resolvePokemonRuntimeMasters({
    species: speciesMaster.id,
    form: 0,
    level: 20,
    exp: 8000,
    hp: 30,
    personal_id: personalId,
    gender: 0,
    ability_index: 0,
    ability: "BASEABILITY",
    held_item: "LEFTOVERS",
    status: "POISON",
    status_count: 2,
    nature_id: "HARDY",
    iv: zeroStats,
    ev: zeroStats,
    moves: [{ id: "CRITKEEP", pp: 7, ppup: 0 }],
  }, {
    species_master: speciesMaster,
    nature_master: { id: "HARDY", stat_changes: [] },
    move_masters: SAFARI_MOVE_MASTERS,
  });
  pokemon.hp = 30;
  return pokemon;
}

function runtimeFor(pokemon, criticalHits) {
  const runtime = createSafariPlayableRuntime();
  runtime.player.party = [pokemon];
  runtime.bag.slots = [];
  runtime.variables.mapless.battle = {
    decision: 1,
    player_critical_hits_dealt: [criticalHits],
    last_operations: [{ op: "request_save", reason: "battle_result" }],
    presentation: [],
  };
  return runtime;
}

function roundTrip(runtime) {
  const storage = new MemoryStorage();
  saveSafariPlayableRun(storage, runtime);
  assert.equal(hasSafariPlayableRun(storage), true);
  const fresh = createSafariPlayableRuntime();
  const loaded = loadSafariPlayableRun(storage, fresh);
  assert.equal(loaded.found, true);
  return loaded.state.player.party[0];
}

const belowRuntime = runtimeFor(materialize(base), 2);
commitSafariNormalLevelEvolutionRewardGrowth(belowRuntime, { operations: [], presentation: [] });
assert.equal(belowRuntime.player.party[0].species, "CRITBASE", "below-threshold critical count must not evolve");

const runtime = runtimeFor(materialize(base), 3);
const before = structuredClone(runtime.player.party[0]);
const result = commitSafariNormalLevelEvolutionRewardGrowth(runtime, { operations: [], presentation: [] });
const after = runtime.player.party[0];
assert.equal(after.species, "CRITEVOLVED");
assert.equal(after.form, 1);
assert.equal(after.personal_id, before.personal_id);
assert.equal(after.held_item, "LEFTOVERS");
assert.equal(after.status, "POISON");
assert.equal(after.status_count, 2);
assert.equal(after.moves[0].id, "CRITKEEP");
assert.equal(after.moves[0].pp, 7, "existing PP must not refill during after-battle evolution");
assert.equal(after.moves[1].id, "CRITEVOMOVE");
assert.equal(after.moves[1].pp, 15, "new evolution move starts with canonical full PP");
assert.ok(after.hp > before.hp && after.hp < after.max_hp, "wounded HP follows max-HP delta without a full heal");
assert.equal(after.ability_index, 0);
assert.equal(after.ability, "EVOLVEDABILITY");
assert.ok(result.operations.some((operation) => operation.op === "level_evolution" && operation.method === "BattleDealCriticalHit"));
assert.equal(result.persistenceRequested, true, "existing battle request_save must survive evolution commit");
const continued = roundTrip(runtime);
assert.deepEqual(continued, after, "fresh Continue must preserve the evolved individual and all persistent battle state exactly");

const precedencePokemon = { ...materialize(both, 123456789), __battle_level_evolution_pending: true };
const precedenceRuntime = runtimeFor(precedencePokemon, 5);
const precedence = commitSafariNormalLevelEvolutionRewardGrowth(precedenceRuntime, { operations: [], presentation: [] });
assert.equal(precedenceRuntime.player.party[0].species, "LEVELNEXT", "canonical pbEvolutionCheck gives successful level-up evolution precedence");
assert.ok(precedence.operations.some((operation) => operation.op === "level_evolution" && operation.to === "LEVELNEXT"));
assert.ok(!precedence.operations.some((operation) => operation.op === "level_evolution" && operation.to === "CRITNEXT"),
  "after-battle evolution must not chain after a successful level-up evolution in the same battle check");

console.log("Safari terminal BattleDealCriticalHit evolution -> persistence -> fresh Continue: PASS");

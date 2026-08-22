import assert from "node:assert/strict";

import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import { commitSafariNormalLevelEvolutionRewardGrowth } from "../runtime/safari-normal-battle-finalize.js";
import { recordSafariPlayerDirectDamageTaken } from "../runtime/safari-normal-battle-round.js";
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
const damageBase = {
  id: "DAMAGEBASE", form: 0, types: ["GHOST"], growth_rate: "Medium", base_exp: 80, catch_rate: 255,
  base_stats: { HP: 80, ATTACK: 60, DEFENSE: 70, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 70, SPEED: 50 },
  abilities: ["DAMAGEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
  level_moves: [], evolutions: [["DAMAGEEVENTNEXT", "EventAfterDamageTaken", 49, false]],
};
const eventNext = {
  ...damageBase,
  id: "DAMAGEEVENTNEXT",
  base_stats: { HP: 100, ATTACK: 80, DEFENSE: 90, SPECIAL_ATTACK: 80, SPECIAL_DEFENSE: 90, SPEED: 60 },
  evolutions: [],
};
Object.assign(SAFARI_SPECIES_MASTERS, { DAMAGEBASE: damageBase, DAMAGEEVENTNEXT: eventNext });
Object.assign(SAFARI_MOVE_MASTERS, {
  DAMAGEKEEP: { id: "DAMAGEKEEP", name: "Damage Keep", category: "Physical", power: 40, accuracy: 100, total_pp: 20, priority: 0, type: "GHOST", thaws_user: false },
});

function materialize(personalId = 42424242) {
  const pokemon = resolvePokemonRuntimeMasters({
    species: "DAMAGEBASE",
    form: 0,
    level: 20,
    exp: 8000,
    hp: 55,
    personal_id: personalId,
    gender: 0,
    ability_index: 0,
    ability: "DAMAGEABILITY",
    held_item: "LEFTOVERS",
    status: "POISON",
    status_count: 2,
    nature_id: "HARDY",
    iv: zeroStats,
    ev: zeroStats,
    moves: [{ id: "DAMAGEKEEP", pp: 7, ppup: 0 }],
  }, {
    species_master: damageBase,
    nature_master: { id: "HARDY", stat_changes: [] },
    move_masters: SAFARI_MOVE_MASTERS,
  });
  pokemon.hp = 55;
  return pokemon;
}

function resolvedWith(...operations) {
  return { operations };
}

function runtimeFor(pokemon) {
  const runtime = createSafariPlayableRuntime();
  runtime.player.party = [pokemon];
  runtime.bag.slots = [];
  runtime.variables.mapless.battle = {
    decision: 1,
    player_direct_damage_taken: [],
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

const runtime = runtimeFor(materialize());
const battle = runtime.variables.mapless.battle;
const before = structuredClone(runtime.player.party[0]);

assert.equal(recordSafariPlayerDirectDamageTaken(battle, 0, resolvedWith(
  { op: "reduce_hp", actor: "foe", target: "player", amount: 20, hpBefore: 55, hpAfter: 35 },
  { op: "reduce_self_hp", actor: "player", target: "player", amount: 8, hpBefore: 35, hpAfter: 27 },
)), 20, "only foe direct attack damage counts; recoil/self damage must not count");
assert.equal(recordSafariPlayerDirectDamageTaken(battle, 0, resolvedWith(
  { op: "reduce_hp", actor: "foe", target: "player", amount: 28, hpBefore: 35, hpAfter: 7 },
  { op: "reduce_hp", actor: "player", target: "foe", amount: 99, hpBefore: 99, hpAfter: 0 },
)), 28);
assert.deepEqual(battle.player_direct_damage_taken, [48]);

let result = commitSafariNormalLevelEvolutionRewardGrowth(runtime, { operations: [], presentation: [] });
assert.equal(runtime.player.party[0].ready_to_evolve, false, "48 direct damage must stay below canonical ready threshold");
assert.equal(runtime.player.party[0].species, "DAMAGEBASE");
assert.ok(result.operations.some((operation) => operation.op === "unsupported_evolution_methods" && operation.methods.includes("EventAfterDamageTaken")),
  "actual event-triggered species change remains explicit and unsupported");

assert.equal(recordSafariPlayerDirectDamageTaken(battle, 0, resolvedWith(
  { op: "reduce_hp", actor: "foe", target: "player", hpBefore: 7, hpAfter: 6 },
)), 1, "hpBefore/hpAfter fallback must count when amount is absent");
assert.deepEqual(battle.player_direct_damage_taken, [49]);

result = commitSafariNormalLevelEvolutionRewardGrowth(runtime, { operations: [], presentation: [] });
const after = runtime.player.party[0];
assert.equal(after.ready_to_evolve, true, "49 direct attack damage must arm ready_to_evolve");
assert.equal(after.species, "DAMAGEBASE", "after-battle ready state must not perform the later event-triggered evolution");
assert.equal(after.personal_id, before.personal_id);
assert.equal(after.held_item, "LEFTOVERS");
assert.equal(after.ability, "DAMAGEABILITY");
assert.equal(after.status, "POISON");
assert.equal(after.status_count, 2);
assert.equal(after.moves[0].id, "DAMAGEKEEP");
assert.equal(after.moves[0].pp, 7, "after-battle ready state must not refill PP");
assert.equal(after.hp, before.hp, "after-battle ready state must not heal HP");
assert.ok(result.operations.some((operation) => operation.op === "set_ready_to_evolve" && operation.directDamageTaken === 49));
assert.equal(result.persistenceRequested, true, "existing battle request_save must survive ready-state commit");

const continued = roundTrip(runtime);
assert.deepEqual(continued, after, "fresh Continue must preserve ready state and individual battle state exactly");

console.log("Safari direct battle damage -> EventAfterDamageTaken ready state -> persistence -> fresh Continue: PASS");

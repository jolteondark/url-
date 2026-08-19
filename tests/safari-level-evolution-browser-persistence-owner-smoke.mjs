import assert from "node:assert/strict";

import { commitBattleSystemsExpRuntime } from "../runtime/battle-exp-runtime-integration.js";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import { setSafariBattleMoveLearningDecision } from "../runtime/safari-battle-move-learning-choice.js";
import { normalBattleExpInput } from "../runtime/safari-normal-battle-finalize.js";
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
const source = {
  id: "BROWSERCONTINUE1",
  name: "Browser Continue 1",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 60,
  catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  level_moves: [{ level: 11, move: "BCMOVE1" }, { level: 12, move: "BCMOVE2" }],
  evolutions: [{ species: "BROWSERCONTINUE2", method: "Level", parameter: 12 }],
};
const evolved = {
  id: "BROWSERCONTINUE2",
  name: "Browser Continue 2",
  form: 1,
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 120,
  catch_rate: 255,
  base_stats: { HP: 70, ATTACK: 65, DEFENSE: 60, SPECIAL_ATTACK: 55, SPECIAL_DEFENSE: 60, SPEED: 50 },
  level_moves: [],
  evolutions: [{ species: "UNSUPPORTED", method: "Item", parameter: "MOONSTONE" }],
};
const foe = {
  id: "BROWSERCONTINUEFOE",
  name: "Browser Continue Foe",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 1020,
  catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
  level_moves: [],
  evolutions: [],
};
const newMoveMasters = {
  BCMOVE1: { id: "BCMOVE1", name: "BC Move 1", category: "Status", power: 0, accuracy: 100, total_pp: 11, priority: 0, type: "NORMAL", thaws_user: false },
  BCMOVE2: { id: "BCMOVE2", name: "BC Move 2", category: "Status", power: 0, accuracy: 100, total_pp: 12, priority: 0, type: "NORMAL", thaws_user: false },
};
Object.assign(SAFARI_SPECIES_MASTERS, {
  BROWSERCONTINUE1: source,
  BROWSERCONTINUE2: evolved,
  BROWSERCONTINUEFOE: foe,
});
Object.assign(SAFARI_MOVE_MASTERS, newMoveMasters);

function initialPokemon(hp = 15) {
  const pokemon = resolvePokemonRuntimeMasters({
    species: source.id,
    level: 10,
    exp: minimumExpForLevel("Medium", 10),
    personal_id: 246813579,
    gender: 0,
    form: 0,
    hp,
    status: "POISON",
    status_count: 2,
    item: "BERRY",
    ability_id: "KEEPABILITY",
    ability_index: 1,
    nature_id: "HARDY",
    iv: zeroStats,
    ev: zeroStats,
    moves: [
      { id: "TACKLE", pp: 3, ppup: 0 },
      { id: "QUICKATTACK", pp: 4, ppup: 0 },
      { id: "BITE", pp: 5, ppup: 0 },
      { id: "SWIFT", pp: 6, ppup: 0 },
    ],
  }, {
    species_master: source,
    nature_master: { id: "HARDY", stat_changes: [] },
    move_masters: SAFARI_MOVE_MASTERS,
  });
  pokemon.hp = hp;
  return pokemon;
}

function commitGrowth(runtime) {
  setSafariBattleMoveLearningDecision(runtime, { level: 11, moveId: "BCMOVE1", forgetIndex: 1 });
  setSafariBattleMoveLearningDecision(runtime, { level: 12, moveId: "BCMOVE2", forgetIndex: 2 });
  const expInput = normalBattleExpInput(runtime.player.party[0], { species: foe.id, level: 10 }, false);
  return commitBattleSystemsExpRuntime({
    pokemon: runtime.player.party[0],
    battleInput: {
      rounds: [{
        actions: [{
          postHitResolution: { operations: [{ op: "gain_exp_request" }] },
          battleExpInput: expInput,
        }],
      }],
    },
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
  });
}

function browserRoundTrip(pokemon) {
  const runtime = createSafariPlayableRuntime();
  runtime.player.party = [pokemon];
  runtime.variables.mapless.battle = null;
  runtime.variables.mapless.location = "day_board";
  const storage = new MemoryStorage();
  const saved = saveSafariPlayableRun(storage, runtime);
  assert.ok(saved.payload, "browser persistence owner must emit a save payload");
  assert.equal(hasSafariPlayableRun(storage), true, "browser save key must be visible to Continue");
  const freshRuntime = createSafariPlayableRuntime();
  const loaded = loadSafariPlayableRun(storage, freshRuntime);
  assert.equal(loaded.found, true, "fresh browser Continue must find the persisted run");
  return loaded.state.player.party[0];
}

const runtime = createSafariPlayableRuntime();
runtime.player.party = [initialPokemon(15)];
runtime.variables.mapless.battle = { completed: false, player_party_index: 0 };
const initial = structuredClone(runtime.player.party[0]);
const committed = commitGrowth(runtime);
const after = committed.pokemon;
runtime.player.party[0] = after;

assert.equal(after.level, 12, "Battle EXP must cross both level boundaries");
assert.equal(after.species, evolved.id, "eligible Level evolution must execute after growth");
assert.equal(after.form, 1, "target form must be applied");
assert.deepEqual(after.moves.map((move) => move.id), ["TACKLE", "BCMOVE1", "BCMOVE2", "SWIFT"]);
assert.equal(after.moves[0].pp, 3, "untouched PP must not refill during level/evolution");
assert.equal(after.moves[3].pp, 6, "untouched PP must not refill during level/evolution");
assert.equal(after.personal_id, initial.personal_id, "evolution must preserve individual identity");
assert.equal(after.ability_id, "KEEPABILITY", "ability identity must survive evolution");
assert.equal(after.ability_index, 1, "ability slot must survive evolution");
assert.equal(after.item, "BERRY", "held item must survive evolution");
assert.equal(after.status, "POISON", "status must survive evolution");
assert.equal(after.status_count, 2, "status count must survive evolution");
assert.equal(after.hp, initial.hp + (after.max_hp - initial.max_hp), "injured HP must follow the canonical max-HP delta");
assert.deepEqual(committed.commits[0].unsupportedEvolutionMethods, ["Item"], "unsupported methods must remain explicit");

const continued = browserRoundTrip(after);
assert.deepEqual(continued, after,
  "browser save owner -> fresh Continue must preserve the evolved individual exactly, including form/stats/HP/moves/PP/item/status/identity");

const faintedRuntime = createSafariPlayableRuntime();
faintedRuntime.player.party = [initialPokemon(0)];
faintedRuntime.variables.mapless.battle = { completed: false, player_party_index: 0 };
const faintedCommitted = commitGrowth(faintedRuntime);
assert.equal(faintedCommitted.pokemon.species, evolved.id);
assert.equal(faintedCommitted.pokemon.hp, 0, "level/evolution must not revive a fainted Pokemon");
const faintedContinued = browserRoundTrip(faintedCommitted.pokemon);
assert.deepEqual(faintedContinued, faintedCommitted.pokemon,
  "browser fresh Continue must preserve the fainted evolved individual exactly");
assert.equal(faintedContinued.hp, 0, "browser Continue must not revive fainted HP");
assert.equal(faintedContinued.personal_id, 246813579, "browser Continue must preserve individual identity");

console.log("Safari Battle EXP -> multi-level moves -> Level evolution -> browser save owner -> fresh Continue: PASS");

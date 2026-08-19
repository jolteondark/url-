import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const { minimumExpForLevel } = await import("../runtime/pokemon-growth-rate.js");
const { resolvePokemonRuntimeMasters } = await import("../runtime/pokemon-runtime-masters.js");
const { setSafariBattleMoveLearningDecision } = await import("../runtime/safari-battle-move-learning-choice.js");
const { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } = await import("../runtime/safari-playable-data.js");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const source = {
  id: "REALROUNDGROW1",
  name: "Real Round Grow 1",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 60,
  catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 80, DEFENSE: 70, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 70, SPEED: 120 },
  level_moves: [{ level: 11, move: "REALROUNDMOVE1" }, { level: 12, move: "REALROUNDMOVE2" }],
  evolutions: [
    { species: "REALROUNDGROW2", method: "Level", parameter: 12 },
    { species: "UNSUPPORTED", method: "Item", parameter: "MOONSTONE" },
  ],
};
const evolved = {
  id: "REALROUNDGROW2",
  name: "Real Round Grow 2",
  form: 1,
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 120,
  catch_rate: 255,
  base_stats: { HP: 70, ATTACK: 110, DEFENSE: 90, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 90, SPEED: 130 },
  level_moves: [],
  evolutions: [{ species: "UNSUPPORTED2", method: "Trade", parameter: null }],
};
const foe = {
  id: "REALROUNDGROWFOE",
  name: "Real Round Grow Foe",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 1020,
  catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 1 },
  level_moves: [],
  evolutions: [],
};

Object.assign(SAFARI_SPECIES_MASTERS, {
  REALROUNDGROW1: source,
  REALROUNDGROW2: evolved,
  REALROUNDGROWFOE: foe,
});
Object.assign(SAFARI_MOVE_MASTERS, {
  REALROUNDKO: { id: "REALROUNDKO", name: "Real Round KO", category: "Physical", power: 250, accuracy: 100, total_pp: 9, priority: 0, type: "NORMAL", thaws_user: false },
  REALROUNDWAIT: { id: "REALROUNDWAIT", name: "Real Round Wait", category: "Status", power: 0, accuracy: 100, total_pp: 20, priority: 0, type: "NORMAL", thaws_user: false },
  REALROUNDMOVE1: { id: "REALROUNDMOVE1", name: "Real Round Move 1", category: "Status", power: 0, accuracy: 100, total_pp: 11, priority: 0, type: "NORMAL", thaws_user: false },
  REALROUNDMOVE2: { id: "REALROUNDMOVE2", name: "Real Round Move 2", category: "Status", power: 0, accuracy: 100, total_pp: 12, priority: 0, type: "NORMAL", thaws_user: false },
});

function materialize(speciesMaster, input) {
  return resolvePokemonRuntimeMasters(input, {
    species_master: speciesMaster,
    nature_master: { id: "HARDY", stat_changes: [] },
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

const runtime = web.createSafariPlayableRuntime();
const player = materialize(source, {
  species: source.id,
  level: 10,
  exp: minimumExpForLevel("Medium", 10),
  personal_id: 135792468,
  gender: 0,
  form: 0,
  hp: 15,
  status: "POISON",
  status_count: 2,
  item: "BERRY",
  ability_id: "KEEPABILITY",
  ability_index: 1,
  nature_id: "HARDY",
  iv: zeroStats,
  ev: zeroStats,
  moves: [
    { id: "REALROUNDKO", pp: 3, ppup: 0 },
    { id: "QUICKATTACK", pp: 4, ppup: 0 },
    { id: "BITE", pp: 5, ppup: 0 },
    { id: "SWIFT", pp: 6, ppup: 0 },
  ],
});
player.hp = 15;
const opponent = materialize(foe, {
  species: foe.id,
  level: 10,
  exp: minimumExpForLevel("Medium", 10),
  personal_id: 97531,
  nature_id: "HARDY",
  iv: zeroStats,
  ev: zeroStats,
  moves: [{ id: "REALROUNDWAIT", pp: 20, ppup: 0 }],
});
opponent.hp = 1;
opponent.max_hp = Math.max(1, Number(opponent.max_hp));
opponent.stats.DEFENSE = 1;
opponent.stats.SPECIAL_DEFENSE = 1;
opponent.stats.SPEED = 1;

runtime.player.party = [player];
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "NORMAL", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.location = "battle";
state.battle = {
  kind: "wild",
  origin: "day_board",
  completed: false,
  decision: 0,
  turn: 1,
  board_index: 0,
  player_party_index: 0,
  player_party_order: [0],
  foe: opponent,
  encounter: { species_id: foe.id, species_name: foe.name, level: 10 },
};

setSafariBattleMoveLearningDecision(runtime, { level: 11, moveId: "REALROUNDMOVE1", forgetIndex: 1 });
setSafariBattleMoveLearningDecision(runtime, { level: 12, moveId: "REALROUNDMOVE2", forgetIndex: 2 });
const before = structuredClone(runtime.player.party[0]);

const result = await web.resolveSafariBattleRound(runtime, "REALROUNDKO");
const after = runtime.player.party[0];

assert.equal(result.decision, 1, "real normal Battle round must end in victory");
assert.equal(result.phase, "RESULT", "central orchestrator must publish RESULT");
assert.equal(result.persistenceRequested, true, "terminal real round must surface request_save for browser persistence");
assert.equal(after.level, 12, "real Battle EXP commit must cross both level boundaries");
assert.equal(after.species, evolved.id, "eligible Level evolution must run inside the real Battle owner");
assert.equal(after.form, 1, "target form must be applied by the evolution owner");
assert.deepEqual(after.moves.map((move) => move.id), ["REALROUNDKO", "REALROUNDMOVE1", "REALROUNDMOVE2", "SWIFT"]);
assert.equal(after.moves[0].pp, 2, "the actually used move must consume exactly one PP and must not refill during growth/evolution");
assert.equal(after.moves[3].pp, 6, "untouched move PP must remain unchanged");
assert.equal(after.personal_id, before.personal_id, "evolution must preserve individual identity");
assert.equal(after.ability_id, "KEEPABILITY");
assert.equal(after.ability_index, 1);
assert.equal(after.item, "BERRY");
assert.equal(after.status, "POISON");
assert.equal(after.status_count, 2);
assert.equal(after.hp, before.hp + (after.max_hp - before.max_hp), "injured HP must follow the canonical max-HP delta rather than full-heal");
assert.ok(result.operations.some((operation) => operation.op === "level_up" && Number(operation.level) === 11));
assert.ok(result.operations.some((operation) => operation.op === "level_up" && Number(operation.level) === 12));
assert.ok(result.operations.some((operation) => operation.op === "replace_move" && operation.move === "REALROUNDMOVE1"));
assert.ok(result.operations.some((operation) => operation.op === "replace_move" && operation.move === "REALROUNDMOVE2"));
assert.ok(result.operations.some((operation) => operation.op === "level_evolution" && operation.to === evolved.id));
assert.ok(result.operations.some((operation) => operation.op === "request_save"), "real terminal round must carry the save operation into RESULT");
assert.deepEqual(result.expIntegration.commits[0].unsupportedEvolutionMethods.sort(), ["Item", "Trade"].sort(),
  "unsupported evolution methods on both source and evolved species must remain explicit");

const storage = new MemoryStorage();
const saved = web.saveSafariPlayableRun(storage, runtime);
assert.ok(saved.payload);
assert.equal(web.hasSafariPlayableRun(storage), true);
const fresh = web.createSafariPlayableRuntime();
const loaded = web.loadSafariPlayableRun(storage, fresh);
assert.equal(loaded.found, true);
assert.deepEqual(loaded.state.player.party[0], after,
  "real Battle growth/evolution result must survive browser save -> fresh Continue exactly");

console.log("Safari real Battle round -> multi-level moves -> Level evolution -> save -> fresh Continue: PASS");

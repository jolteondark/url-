import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const startup = await import("../runtime/safari-web-startup.js");
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
  id: "BLOCKGROW1", name: "Block Grow 1", types: ["NORMAL"], growth_rate: "Medium", base_exp: 60, catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 90, DEFENSE: 70, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 70, SPEED: 120 },
  level_moves: [{ level: 11, move: "BLOCKMOVE1" }, { level: 12, move: "BLOCKMOVE2" }],
  evolutions: [
    { species: "BLOCKGROW2", method: "Level", parameter: 12 },
    { species: "BLOCKUNSUPPORTED", method: "Item", parameter: "MOONSTONE" },
  ],
};
const evolved = {
  id: "BLOCKGROW2", name: "Block Grow 2", form: 2, types: ["NORMAL"], growth_rate: "Medium", base_exp: 120, catch_rate: 255,
  base_stats: { HP: 75, ATTACK: 120, DEFENSE: 95, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 95, SPEED: 130 },
  level_moves: [], evolutions: [],
};
const foe = {
  id: "BLOCKFOE", name: "Block Foe", types: ["NORMAL"], growth_rate: "Medium", base_exp: 700, catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 1 },
  level_moves: [], evolutions: [],
};
Object.assign(SAFARI_SPECIES_MASTERS, { BLOCKGROW1: source, BLOCKGROW2: evolved, BLOCKFOE: foe });
Object.assign(SAFARI_MOVE_MASTERS, {
  BLOCKKO: { id: "BLOCKKO", name: "Block KO", category: "Physical", power: 250, accuracy: 100, total_pp: 9, priority: 0, type: "NORMAL", thaws_user: false },
  BLOCKWAIT: { id: "BLOCKWAIT", name: "Block Wait", category: "Status", power: 0, accuracy: 100, total_pp: 20, priority: 0, type: "NORMAL", thaws_user: false },
  BLOCKMOVE1: { id: "BLOCKMOVE1", name: "Block Move 1", category: "Status", power: 0, accuracy: 100, total_pp: 11, priority: 0, type: "NORMAL", thaws_user: false },
  BLOCKMOVE2: { id: "BLOCKMOVE2", name: "Block Move 2", category: "Status", power: 0, accuracy: 100, total_pp: 12, priority: 0, type: "NORMAL", thaws_user: false },
});

function materialize(master, input) {
  return resolvePokemonRuntimeMasters(input, {
    species_master: master,
    nature_master: { id: "HARDY", stat_changes: [] },
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

function buildRuntime({ heldItem = "EVERSTONE", ability = "KEEPAUTHABILITY" } = {}) {
  const runtime = web.createSafariPlayableRuntime();
  const player = materialize(source, {
    species: source.id, level: 10, exp: minimumExpForLevel("Medium", 10), personal_id: 44556677,
    form: 0, hp: 12, status: "POISON", status_count: 2, item: "STALEITEM", ability_id: "STALEABILITY",
    nature_id: "HARDY", iv: zeroStats, ev: zeroStats,
    moves: [
      { id: "BLOCKKO", pp: 4, ppup: 0 }, { id: "QUICKATTACK", pp: 4, ppup: 0 },
      { id: "BITE", pp: 5, ppup: 0 }, { id: "SWIFT", pp: 6, ppup: 0 },
    ],
  });
  player.hp = 12;
  player.ability = ability;
  player.held_item = heldItem;
  const enemy = materialize(foe, {
    species: foe.id, level: 10, exp: minimumExpForLevel("Medium", 10), personal_id: 99001,
    nature_id: "HARDY", iv: zeroStats, ev: zeroStats, moves: [{ id: "BLOCKWAIT", pp: 20, ppup: 0 }],
  });
  enemy.hp = 1;
  enemy.stats.DEFENSE = 1;
  enemy.stats.SPECIAL_DEFENSE = 1;
  enemy.stats.SPEED = 1;
  runtime.player.party = [player];
  const state = runtime.variables.mapless;
  state.board_events[0] = { kind: "trainer", type: "NORMAL", slot: 0, trainer_full_name: "Blocker Trainer" };
  state.board_revealed[0] = true;
  state.location = "battle";
  state.battle = {
    kind: "trainer", origin: "day_board", completed: false, decision: 0, turn: 1, board_index: 0,
    player_party_index: 0, player_party_order: [0], foe: structuredClone(enemy),
    trainer_party: [structuredClone(enemy)], trainer_party_index: 0, trainer_party_order: [0],
    trainer_seed: 123, skill_level: 0, trainer_flags: [], trainer: { trainer_full_name: "Blocker Trainer" }, prize_money: 0,
  };
  setSafariBattleMoveLearningDecision(runtime, { level: 11, moveId: "BLOCKMOVE1", forgetIndex: 1 });
  setSafariBattleMoveLearningDecision(runtime, { level: 12, moveId: "BLOCKMOVE2", forgetIndex: 2 });
  return runtime;
}

for (const blocker of [
  { heldItem: "EVERSTONE", ability: "KEEPAUTHABILITY", expected: "EVERSTONE" },
  { heldItem: "KEEPBERRY", ability: "BATTLEBOND", expected: "BATTLEBOND" },
]) {
  const runtime = buildRuntime(blocker);
  const identity = runtime.player.party[0].personal_id;
  const result = await web.resolveSafariBattleRound(runtime, "BLOCKKO");
  const pokemon = runtime.player.party[0];
  assert.equal(result.decision, 1);
  assert.equal(result.phase, "RESULT");
  assert.equal(pokemon.level, 12, "canonical blocker must not suppress EXP or crossed-level move learning");
  assert.deepEqual(pokemon.moves.map((move) => move.id), ["BLOCKKO", "BLOCKMOVE1", "BLOCKMOVE2", "SWIFT"]);
  assert.equal(pokemon.species, source.id, `${blocker.expected} must suppress eligible Level evolution`);
  assert.equal(pokemon.form, 0);
  assert.equal(pokemon.personal_id, identity);
  assert.equal(pokemon.held_item, blocker.heldItem);
  assert.equal(pokemon.ability, blocker.ability);
  assert.equal(pokemon.status, "POISON");
  assert.equal(pokemon.status_count, 2);
  assert.equal(pokemon.moves[0].pp, 3, "battle PP consumption must survive blocked evolution");
  assert.equal("__battle_level_evolution_pending" in pokemon, false, "terminal evolution check must clear the transient marker even when blocked");
  assert.ok(result.operations.some((operation) => operation.op === "level_evolution_blocked" && operation.blocker === blocker.expected));
  assert.deepEqual(runtime.variables.mapless.battle.unsupported_evolution_methods, ["Item"]);

  const storage = new MemoryStorage();
  const snapshot = structuredClone(pokemon);
  startup.saveSafariPlayableRun(storage, runtime);
  const fresh = startup.createSafariPlayableRuntime();
  const continued = startup.loadSafariPlayableRun(storage, fresh);
  assert.equal(continued.found, true);
  assert.deepEqual(continued.state.player.party[0], snapshot, "blocked evolution must preserve the same individual through fresh Continue");
}

console.log("Safari real battle Level evolution canonical blockers + move learning + Continue: PASS");

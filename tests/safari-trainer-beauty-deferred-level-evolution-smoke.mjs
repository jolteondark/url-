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
  id: "BEAUTYGROW1",
  name: "Beauty Grow 1",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 60,
  catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 90, DEFENSE: 70, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 70, SPEED: 120 },
  level_moves: [
    { level: 11, move: "BEAUTYMOVE1" },
    { level: 12, move: "BEAUTYMOVE2" },
  ],
  evolutions: [
    { species: "BEAUTYGROW2", method: "Beauty", parameter: 170 },
    { species: "BEAUTYUNSUPPORTED1", method: "Item", parameter: "MOONSTONE" },
  ],
};
const evolved = {
  id: "BEAUTYGROW2",
  name: "Beauty Grow 2",
  form: 2,
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 120,
  catch_rate: 255,
  base_stats: { HP: 75, ATTACK: 120, DEFENSE: 95, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 95, SPEED: 130 },
  level_moves: [],
  evolutions: [{ species: "BEAUTYUNSUPPORTED2", method: "Trade", parameter: null }],
};
const foe1 = {
  id: "BEAUTYFOE1",
  name: "Beauty Foe 1",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 700,
  catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 1 },
  level_moves: [],
  evolutions: [],
};
const foe2 = { ...foe1, id: "BEAUTYFOE2", name: "Beauty Foe 2", base_exp: 10 };

Object.assign(SAFARI_SPECIES_MASTERS, {
  BEAUTYGROW1: source,
  BEAUTYGROW2: evolved,
  BEAUTYFOE1: foe1,
  BEAUTYFOE2: foe2,
});
Object.assign(SAFARI_MOVE_MASTERS, {
  BEAUTYKO: { id: "BEAUTYKO", name: "Beauty KO", category: "Physical", power: 250, accuracy: 100, total_pp: 9, priority: 0, type: "NORMAL", thaws_user: false },
  BEAUTYWAIT: { id: "BEAUTYWAIT", name: "Beauty Wait", category: "Status", power: 0, accuracy: 100, total_pp: 20, priority: 0, type: "NORMAL", thaws_user: false },
  BEAUTYMOVE1: { id: "BEAUTYMOVE1", name: "Beauty Move 1", category: "Status", power: 0, accuracy: 100, total_pp: 11, priority: 0, type: "NORMAL", thaws_user: false },
  BEAUTYMOVE2: { id: "BEAUTYMOVE2", name: "Beauty Move 2", category: "Status", power: 0, accuracy: 100, total_pp: 12, priority: 0, type: "WATER", thaws_user: false },
});

function materialize(speciesMaster, input) {
  return resolvePokemonRuntimeMasters(input, {
    species_master: speciesMaster,
    nature_master: { id: "HARDY", stat_changes: [] },
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

function weakFoe(master, personalId) {
  const pokemon = materialize(master, {
    species: master.id,
    level: 10,
    exp: minimumExpForLevel("Medium", 10),
    personal_id: personalId,
    nature_id: "HARDY",
    iv: zeroStats,
    ev: zeroStats,
    moves: [{ id: "BEAUTYWAIT", pp: 20, ppup: 0 }],
  });
  pokemon.hp = 1;
  pokemon.max_hp = Math.max(1, Number(pokemon.max_hp));
  pokemon.stats.DEFENSE = 1;
  pokemon.stats.SPECIAL_DEFENSE = 1;
  pokemon.stats.SPEED = 1;
  return pokemon;
}

const runtime = web.createSafariPlayableRuntime();
const player = materialize(source, {
  species: source.id,
  level: 10,
  exp: minimumExpForLevel("Medium", 10),
  personal_id: 55667788,
  form: 0,
  hp: 12,
  beauty: 170,
  status: "POISON",
  status_count: 2,
  item: "STALEITEM",
  ability_id: "STALEABILITY",
  ability_index: 1,
  nature_id: "HARDY",
  iv: zeroStats,
  ev: zeroStats,
  moves: [
    { id: "BEAUTYKO", pp: 4, ppup: 0 },
    { id: "QUICKATTACK", pp: 4, ppup: 0 },
    { id: "BITE", pp: 5, ppup: 0 },
    { id: "SWIFT", pp: 6, ppup: 0 },
  ],
});
player.hp = 12;
player.ability = "KEEPAUTHABILITY";
player.held_item = "KEEPBERRY";
const first = weakFoe(foe1, 30001);
const second = weakFoe(foe2, 30002);

runtime.player.party = [player];
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "trainer", type: "NORMAL", slot: 0, trainer_full_name: "Beauty Trainer" };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.location = "battle";
state.battle = {
  kind: "trainer",
  origin: "day_board",
  completed: false,
  decision: 0,
  turn: 1,
  board_index: 0,
  player_party_index: 0,
  player_party_order: [0],
  foe: structuredClone(first),
  trainer_party: [structuredClone(first), structuredClone(second)],
  trainer_party_index: 0,
  trainer_party_order: [0, 1],
  trainer_seed: 23456,
  skill_level: 0,
  trainer_flags: [],
  trainer: { trainer_full_name: "Beauty Trainer" },
  prize_money: 0,
};

setSafariBattleMoveLearningDecision(runtime, { level: 11, moveId: "BEAUTYMOVE1", forgetIndex: 1 });
setSafariBattleMoveLearningDecision(runtime, { level: 12, moveId: "BEAUTYMOVE2", forgetIndex: 2 });

const identity = player.personal_id;
const firstResult = await web.resolveSafariBattleRound(runtime, "BEAUTYKO");
const afterFirst = runtime.player.party[0];
assert.equal(firstResult.decision, 0);
assert.equal(afterFirst.level, 12, "first KO must cross both level boundaries exactly");
assert.deepEqual(afterFirst.moves.map((move) => move.id), ["BEAUTYKO", "BEAUTYMOVE1", "BEAUTYMOVE2", "SWIFT"]);
assert.equal(afterFirst.species, source.id, "Beauty evolution must remain deferred between trainer foes");
assert.equal(afterFirst.__battle_level_evolution_pending, true);
assert.equal(firstResult.expIntegration.commits[0].evolutionDeferred, true);
assert.equal(firstResult.expIntegration.commits[0].pendingEvolution?.to, evolved.id);
assert.equal(firstResult.expIntegration.commits[0].pendingEvolution?.method, "Beauty");
assert.equal(firstResult.expIntegration.commits[0].pendingEvolution?.parameter, 170);

const hpBeforeTerminal = afterFirst.hp;
const maxHpBeforeTerminal = afterFirst.max_hp;
const secondResult = await web.resolveSafariBattleRound(runtime, "BEAUTYKO");
const afterSecond = runtime.player.party[0];
assert.equal(secondResult.decision, 1);
assert.equal(secondResult.phase, "RESULT");
assert.equal(secondResult.persistenceRequested, true);
assert.equal(afterSecond.species, evolved.id, "eligible Beauty evolution must commit at terminal REWARD_GROWTH");
assert.equal(afterSecond.form, 2);
assert.equal("__battle_level_evolution_pending" in afterSecond, false);
assert.ok(secondResult.operations.some((operation) => operation.op === "level_evolution"
  && operation.to === evolved.id
  && operation.method === "Beauty"
  && operation.parameter === 170));
assert.deepEqual([...runtime.variables.mapless.battle.unsupported_evolution_methods].sort(), ["Item", "Trade"].sort());
assert.equal(afterSecond.personal_id, identity);
assert.equal(afterSecond.beauty, 170, "Beauty condition metadata must survive evolution");
assert.equal(afterSecond.ability, "KEEPAUTHABILITY");
assert.equal(afterSecond.held_item, "KEEPBERRY");
assert.equal(afterSecond.status, "POISON");
assert.equal(afterSecond.status_count, 2);
assert.equal(afterSecond.hp, hpBeforeTerminal + (afterSecond.max_hp - maxHpBeforeTerminal));
assert.equal(afterSecond.moves[0].pp, 2);
assert.equal(afterSecond.moves[1].pp, 11);
assert.equal(afterSecond.moves[2].pp, 12);
assert.equal(afterSecond.moves[3].pp, 6);

const storage = new MemoryStorage();
const terminalSnapshot = structuredClone(afterSecond);
const saved = startup.saveSafariPlayableRun(storage, runtime);
assert.ok(saved.payload);
assert.equal(startup.hasSafariPlayableRun(storage), true);
const freshRuntime = startup.createSafariPlayableRuntime();
const continued = startup.loadSafariPlayableRun(storage, freshRuntime);
assert.equal(continued.found, true);
const continuedPokemon = continued.state.player.party[0];
assert.deepEqual(continuedPokemon, terminalSnapshot,
  "fresh Continue must preserve the post-Beauty-evolution individual exactly");
assert.equal(continuedPokemon.personal_id, identity);
assert.equal(continuedPokemon.beauty, 170);
assert.equal(continuedPokemon.ability, "KEEPAUTHABILITY");
assert.equal(continuedPokemon.held_item, "KEEPBERRY");
assert.equal(continuedPokemon.status, "POISON");
assert.deepEqual(continuedPokemon.moves.map(({ id, pp }) => ({ id, pp })), [
  { id: "BEAUTYKO", pp: 2 },
  { id: "BEAUTYMOVE1", pp: 11 },
  { id: "BEAUTYMOVE2", pp: 12 },
  { id: "SWIFT", pp: 6 },
]);

console.log("Safari trainer EXP -> multi-level moves -> deferred Beauty evolution -> browser save -> fresh Continue: PASS");

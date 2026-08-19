import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const { minimumExpForLevel } = await import("../runtime/pokemon-growth-rate.js");
const { resolvePokemonRuntimeMasters } = await import("../runtime/pokemon-runtime-masters.js");
const { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } = await import("../runtime/safari-playable-data.js");

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const source = {
  id: "DEFERGROW1",
  name: "Deferred Grow 1",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 60,
  catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 90, DEFENSE: 70, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 70, SPEED: 120 },
  level_moves: [{ level: 11, move: "DEFERMOVE" }],
  evolutions: [
    { species: "DEFERGROW2", method: "Level", parameter: 11 },
    { species: "DEFERUNSUPPORTED1", method: "Item", parameter: "MOONSTONE" },
  ],
};
const evolved = {
  id: "DEFERGROW2",
  name: "Deferred Grow 2",
  form: 2,
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 120,
  catch_rate: 255,
  base_stats: { HP: 75, ATTACK: 120, DEFENSE: 95, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 95, SPEED: 130 },
  level_moves: [],
  evolutions: [{ species: "DEFERUNSUPPORTED2", method: "Trade", parameter: null }],
};
const foe1 = {
  id: "DEFERFOE1",
  name: "Deferred Foe 1",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 700,
  catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 1 },
  level_moves: [],
  evolutions: [],
};
const foe2 = { ...foe1, id: "DEFERFOE2", name: "Deferred Foe 2", base_exp: 10 };

Object.assign(SAFARI_SPECIES_MASTERS, {
  DEFERGROW1: source,
  DEFERGROW2: evolved,
  DEFERFOE1: foe1,
  DEFERFOE2: foe2,
});
Object.assign(SAFARI_MOVE_MASTERS, {
  DEFERKO: { id: "DEFERKO", name: "Deferred KO", category: "Physical", power: 250, accuracy: 100, total_pp: 9, priority: 0, type: "NORMAL", thaws_user: false },
  DEFERWAIT: { id: "DEFERWAIT", name: "Deferred Wait", category: "Status", power: 0, accuracy: 100, total_pp: 20, priority: 0, type: "NORMAL", thaws_user: false },
  DEFERMOVE: { id: "DEFERMOVE", name: "Deferred Move", category: "Status", power: 0, accuracy: 100, total_pp: 11, priority: 0, type: "NORMAL", thaws_user: false },
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
    moves: [{ id: "DEFERWAIT", pp: 20, ppup: 0 }],
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
  personal_id: 11223344,
  form: 0,
  hp: 12,
  status: "POISON",
  status_count: 2,
  item: "STALEITEM",
  ability_id: "STALEABILITY",
  ability_index: 1,
  nature_id: "HARDY",
  iv: zeroStats,
  ev: zeroStats,
  moves: [
    { id: "DEFERKO", pp: 4, ppup: 0 },
    { id: "QUICKATTACK", pp: 4, ppup: 0 },
    { id: "BITE", pp: 5, ppup: 0 },
  ],
});
player.hp = 12;
player.ability = "KEEPAUTHABILITY";
player.held_item = "KEEPBERRY";
const first = weakFoe(foe1, 20001);
const second = weakFoe(foe2, 20002);

runtime.player.party = [player];
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "trainer", type: "NORMAL", slot: 0, trainer_full_name: "Deferred Trainer" };
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
  trainer_seed: 12345,
  skill_level: 0,
  trainer_flags: [],
  trainer: { trainer_full_name: "Deferred Trainer" },
  prize_money: 0,
};

const identity = player.personal_id;
const firstResult = await web.resolveSafariBattleRound(runtime, "DEFERKO");
const afterFirst = runtime.player.party[0];
assert.equal(firstResult.decision, 0, "first trainer foe must hand off to the reserve instead of ending the battle");
assert.equal(afterFirst.species, source.id, "Level evolution must not commit between trainer foes");
assert.equal(afterFirst.__battle_level_evolution_pending, true, "level gain must retain a transient pending-evolution marker until battle end");
assert.ok(Number(afterFirst.level) >= 11, "first KO must make the Level evolution eligible");
assert.equal(firstResult.expIntegration.commits[0].evolutionDeferred, true);
assert.equal(firstResult.expIntegration.commits[0].evolution, null);
assert.equal(firstResult.expIntegration.commits[0].pendingEvolution?.to, evolved.id);
assert.ok(!firstResult.operations.some((operation) => operation.op === "level_evolution"), "nonterminal trainer replacement must not publish evolution");
assert.equal(runtime.variables.mapless.battle.trainer_party_index, 1, "second trainer Pokemon must become active");

const hpBeforeTerminal = afterFirst.hp;
const maxHpBeforeTerminal = afterFirst.max_hp;
const secondResult = await web.resolveSafariBattleRound(runtime, "DEFERKO");
const afterSecond = runtime.player.party[0];
assert.equal(secondResult.decision, 1, "second trainer foe must end the battle");
assert.equal(secondResult.phase, "RESULT");
assert.equal(secondResult.persistenceRequested, true, "terminal result must still surface request_save");
assert.equal(afterSecond.species, evolved.id, "eligible Level evolution must commit only at terminal battle finalize");
assert.equal(afterSecond.form, 2);
assert.equal("__battle_level_evolution_pending" in afterSecond, false, "transient marker must never survive terminal finalize/save");
assert.ok(secondResult.operations.some((operation) => operation.op === "level_evolution" && operation.to === evolved.id));
assert.deepEqual([...runtime.variables.mapless.battle.unsupported_evolution_methods].sort(), ["Item", "Trade"].sort());
assert.equal(afterSecond.personal_id, identity);
assert.equal(afterSecond.ability, "KEEPAUTHABILITY");
assert.equal(afterSecond.held_item, "KEEPBERRY");
assert.equal(afterSecond.status, "POISON");
assert.equal(afterSecond.status_count, 2);
assert.equal(afterSecond.hp, hpBeforeTerminal + (afterSecond.max_hp - maxHpBeforeTerminal), "post-battle evolution must preserve injured HP by max-HP delta");
assert.equal(afterSecond.moves[0].pp, 2, "one move use against each foe must consume exactly two PP across the whole trainer battle");

console.log("Safari trainer multi-foe Level evolution deferred until terminal battle finalize: PASS");

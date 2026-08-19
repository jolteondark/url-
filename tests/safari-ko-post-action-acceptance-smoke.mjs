import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const TACKLE = "TACKLE";
const PRIORITY_TEST = "TESTPLAYER_PRIORITY_KO";
SAFARI_MOVE_MASTERS[PRIORITY_TEST] = Object.freeze({
  id: PRIORITY_TEST,
  name: "Test Player Priority KO",
  category: "Physical",
  power: 0,
  accuracy: 100,
  total_pp: 10,
  priority: 1,
  type: "NORMAL",
  function_code: "FixedDamageUserLevel",
});

function moveRuntime(id = TACKLE, pp = 35) { return { id, pp, ppup: 0 }; }
function activePlayer(runtime) {
  const battle = runtime.variables.mapless.battle;
  return runtime.player.party[Number(battle.player_party_index ?? 0)];
}
function syncTrainerActive(battle) {
  if (battle.kind === "trainer") battle.trainer_party[Number(battle.trainer_party_index ?? 0)] = structuredClone(battle.foe);
}
async function start(kind = "wild", playerMove = TACKLE) {
  const runtime = web.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = kind === "trainer"
    ? { kind: "trainer", trainer_seed: 271828, slot: 0 }
    : { kind: "wild", type: "BUG", slot: 0 };
  state.board_revealed[0] = true;
  state.board_consumed[0] = false;
  state.board_visited[0] = false;
  state.location = "day_board";
  const started = await web.activateSafariDayBoardCell(runtime, 0);
  assert.equal(started.result, "dispatched");
  const battle = state.battle;
  assert.ok(battle && !battle.completed);
  const player = activePlayer(runtime);
  player.moves = [moveRuntime(playerMove, playerMove === PRIORITY_TEST ? 10 : 35)];
  battle.foe.moves = [moveRuntime()];
  syncTrainerActive(battle);
  return { runtime, state, battle, player };
}
function setStats(pokemon, { hp, speed, attack, defense, level }) {
  if (level != null) pokemon.level = level;
  pokemon.max_hp = hp;
  pokemon.hp = hp;
  pokemon.stats.ATTACK = attack;
  pokemon.stats.SPECIAL_ATTACK = attack;
  pokemon.stats.DEFENSE = defense;
  pokemon.stats.SPECIAL_DEFENSE = defense;
  pokemon.stats.SPEED = speed;
}
function moveStarts(result, actor) {
  return (result.presentation ?? []).filter((event) => event.type === "move_started" && event.actor === actor).length;
}
function useMoves(result, actor) {
  return (result.operations ?? []).filter((op) => op.op === "use_move" && op.actor === actor).length;
}
function downstreamEffects(result, actor) {
  return (result.operations ?? []).filter((op) => op.actor === actor && /status|secondary|reduce_hp|reduce_self_hp/i.test(String(op.op ?? "")));
}
function ppOf(pokemon) { return Number(pokemon?.moves?.[0]?.pp ?? -1); }

const trace = [];

// A) player acts first and KOs: no queued foe action may commit anywhere.
{
  const { runtime, battle, player } = await start("wild");
  setStats(player, { hp: 200, speed: 9999, attack: 99999, defense: 99999 });
  setStats(battle.foe, { hp: 1, speed: 1, attack: 1, defense: 1 });
  const playerHpBefore = player.hp;
  const playerStatusBefore = player.status;
  const foePpBefore = ppOf(battle.foe);
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  const afterPlayer = activePlayer(runtime);
  assert.equal(Number(afterPlayer.hp), Number(playerHpBefore));
  assert.equal(afterPlayer.status, playerStatusBefore);
  assert.equal(ppOf(result.foe), foePpBefore, "KOed foe PP must remain unchanged");
  assert.equal(useMoves(result, "foe"), 0);
  assert.equal(moveStarts(result, "foe"), 0);
  assert.deepEqual(downstreamEffects(result, "foe"), []);
  assert.equal((result.presentation ?? []).some((e) => e.type === "damage_applied" && e.target === "player"), false);
  trace.push({ scenario: "A", playerHpBefore, playerHpAfter: afterPlayer.hp, foePpBefore, foePpAfter: ppOf(result.foe), operations: result.operations, presentation: result.presentation });
}

// B) foe acts first and KOs: no queued player action/PP/effect/narration.
{
  const { runtime, battle, player } = await start("wild");
  setStats(player, { hp: 1, speed: 1, attack: 99999, defense: 1 });
  setStats(battle.foe, { hp: 200, speed: 9999, attack: 99999, defense: 99999 });
  const playerPpBefore = ppOf(player);
  const foeHpBefore = battle.foe.hp;
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  assert.equal(ppOf(result.player), playerPpBefore, "KOed player PP must remain unchanged");
  assert.equal(Number(result.foe.hp), Number(foeHpBefore));
  assert.equal(useMoves(result, "player"), 0);
  assert.equal(moveStarts(result, "player"), 0);
  assert.deepEqual(downstreamEffects(result, "player"), []);
  assert.equal((result.presentation ?? []).some((e) => e.type === "damage_applied" && e.target === "foe"), false);
  trace.push({ scenario: "B", playerPpBefore, playerPpAfter: ppOf(result.player), foeHpBefore, foeHpAfter: result.foe.hp, operations: result.operations, presentation: result.presentation });
}

// C) player first but nonlethal: living foe acts exactly once.
{
  const { runtime, battle, player } = await start("wild");
  setStats(player, { hp: 999, speed: 9999, attack: 1, defense: 99999 });
  setStats(battle.foe, { hp: 999, speed: 1, attack: 1, defense: 99999 });
  const foePpBefore = ppOf(battle.foe);
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  assert.equal(useMoves(result, "foe"), 1);
  assert.equal(moveStarts(result, "foe"), 1);
  assert.equal(ppOf(result.foe), foePpBefore - 1);
  trace.push({ scenario: "C", foePpBefore, foePpAfter: ppOf(result.foe), operations: result.operations, presentation: result.presentation });
}

// D) trainer active KO + reserve: send-out only; reserve waits for next command.
{
  const { runtime, battle, player } = await start("trainer");
  assert.ok(Array.isArray(battle.trainer_party) && battle.trainer_party.length >= 2);
  setStats(player, { hp: 999, speed: 9999, attack: 99999, defense: 99999 });
  setStats(battle.foe, { hp: 1, speed: 1, attack: 1, defense: 1 });
  syncTrainerActive(battle);
  const result = await web.resolveSafariBattleRound(runtime, TACKLE);
  assert.equal(useMoves(result, "foe"), 0);
  const faintIndex = result.presentation.findIndex((e) => e.type === "faint" && e.target === "foe");
  const sendOutIndex = result.presentation.findIndex((e) => e.type === "trainer_next");
  assert.ok(faintIndex >= 0 && sendOutIndex > faintIndex);
  assert.equal(result.presentation.slice(sendOutIndex + 1).some((e) => e.type === "move_started" && e.actor === "foe"), false);
  assert.equal(battle.completed, false);
  assert.ok(Number(battle.foe.hp) > 0);
  trace.push({ scenario: "D", operations: result.operations, presentation: result.presentation, reserveSpecies: battle.foe.species });
}

// E) move priority, not raw speed, owns action order; priority KO suppresses the faster foe.
{
  const { runtime, battle, player } = await start("wild", PRIORITY_TEST);
  setStats(player, { hp: 200, speed: 1, attack: 1, defense: 99999, level: 100 });
  setStats(battle.foe, { hp: 20, speed: 9999, attack: 1, defense: 99999, level: 5 });
  const playerHpBefore = player.hp;
  const foePpBefore = ppOf(battle.foe);
  const result = await web.resolveSafariBattleRound(runtime, PRIORITY_TEST);
  assert.equal(Number(activePlayer(runtime).hp), Number(playerHpBefore));
  assert.equal(ppOf(result.foe), foePpBefore);
  assert.equal(useMoves(result, "foe"), 0);
  assert.equal(moveStarts(result, "foe"), 0);
  assert.deepEqual(downstreamEffects(result, "foe"), []);
  trace.push({ scenario: "E", playerHpBefore, playerHpAfter: activePlayer(runtime).hp, foePpBefore, foePpAfter: ppOf(result.foe), operations: result.operations, presentation: result.presentation });
}

delete SAFARI_MOVE_MASTERS[PRIORITY_TEST];
console.log("Safari KO post-action acceptance A-E state/trace/presentation:", JSON.stringify(trace));

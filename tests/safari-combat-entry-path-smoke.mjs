import assert from "node:assert/strict";
import fs from "node:fs";

// Keep safari-general-data-demand on its browser path. In Node it otherwise
// preloads both combat modules at module evaluation time for legacy fixtures.
const runtimeEvents = [];
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = {
  dispatchEvent(event) { runtimeEvents.push(event?.type); return true; },
};

const demand = await import("../runtime/safari-general-data-demand.js");
const { createSafariPlayableRuntime } = await import("../runtime/safari-web-startup.js");
const webPlayable = await import("../runtime/safari-web-playable-integration.js");

function state(runtime) {
  return runtime.variables.mapless;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function prepareCell(runtime, event) {
  const current = state(runtime);
  current.board_events[0] = { ...event, slot: 0 };
  current.board_revealed[0] = false;
  current.board_consumed[0] = false;
  current.battle = null;
  current.shop = null;
  current.location = "day_board";
}

function assertBattleStarted(runtime, result, kind) {
  const battle = state(runtime).battle;
  assert.equal(result.result, "dispatched");
  assert.equal(result.boundary, kind);
  assert.ok(battle, `${kind} Day Board activation must create Battle state`);
  assert.equal(battle.kind, kind);
  assert.equal(battle.completed, false);
  assert.equal(battle.decision, 0);
  assert.ok(battle.foe?.species, `${kind} Battle must materialize an opponent owner`);
  assert.ok(Array.isArray(battle.foe?.moves) && battle.foe.moves.length > 0, `${kind} opponent must have canonical moves`);
  assert.ok(battle.last_operations.some((operation) => operation.op === "scene_start_battle"), `${kind} path must enter the Battle scene owner`);
  assert.ok(battle.last_operations.some((operation) => operation.op === "battle_loop_handoff"), `${kind} path must hand off to the Battle loop owner`);
}

function preparePlayerForKo(runtime) {
  const player = runtime.player.party[0];
  player.hp = Math.max(1, Number(player.max_hp ?? player.hp ?? 1));
  player.stats.ATTACK = Math.max(999, Number(player.stats.ATTACK ?? 0));
  player.stats.SPEED = Math.max(999, Number(player.stats.SPEED ?? 0));
  return moveId(player.moves[0]);
}

function primeFoeAtOneHp(battle) {
  battle.foe.hp = 1;
  battle.foe.fainted = false;
  if (Array.isArray(battle.trainer_party) && Number.isInteger(battle.trainer_party_index)) {
    battle.trainer_party[battle.trainer_party_index] = structuredClone(battle.foe);
  }
}

// The real board click is asynchronous. Generic event presentation must not
// claim wild/trainer cells while GENERAL data is still loading, and Battle
// creation must notify the deferred scene owners after state.battle exists.
{
  const presentationSource = fs.readFileSync(new URL("../game-presentation.js", import.meta.url), "utf8");
  const combatStartSource = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");
  assert.match(presentationSource, /boardEvent\?\.kind===\"wild\"\|\|boardEvent\?\.kind===\"trainer\"/);
  assert.match(combatStartSource, /new CustomEvent\(\"safari-runtime-changed\"\)/);
}

assert.equal(demand.safariGeneralCombatReady(), false);
assert.equal(demand.safariGeneralCombatReady("wild"), false);
assert.equal(demand.safariGeneralCombatReady("trainer"), false);

// Real public web entry: board action -> Battle object -> nonterminal turn with
// HP carryover -> terminal KO -> board return. This keeps the #158 carryover
// and #159 KO-decision contracts on the same entrypoint used by preview-app.
const wildRuntime = createSafariPlayableRuntime();
prepareCell(wildRuntime, { kind: "wild", type: "BUG" });
const wildResult = await webPlayable.activateSafariDayBoardCell(wildRuntime, 0);
assertBattleStarted(wildRuntime, wildResult, "wild");
await Promise.resolve();
assert.ok(runtimeEvents.includes("safari-runtime-changed"), "Battle creation must notify the Safari scene owner after async combat load");
assert.equal(demand.safariGeneralCombatReady("wild"), true, "wild cell must load the encounter owner");
assert.equal(demand.safariGeneralCombatReady("trainer"), false, "wild cell must not require the trainer generator");
const wildPlayer = wildRuntime.player.party[0];
const wildBattle = state(wildRuntime).battle;
const wildMoveId = moveId(wildPlayer.moves[0]);
wildPlayer.max_hp = 999;
wildPlayer.hp = 999;
wildPlayer.stats.ATTACK = 1;
wildPlayer.stats.SPECIAL_ATTACK = 1;
wildPlayer.stats.DEFENSE = 999;
wildPlayer.stats.SPECIAL_DEFENSE = 999;
wildBattle.foe.max_hp = 999;
wildBattle.foe.hp = 999;
wildBattle.foe.stats.ATTACK = 1;
wildBattle.foe.stats.SPECIAL_ATTACK = 1;
wildBattle.foe.stats.DEFENSE = 999;
wildBattle.foe.stats.SPECIAL_DEFENSE = 999;
const firstWildRound = await webPlayable.resolveSafariBattleRound(wildRuntime, wildMoveId);
assert.equal(firstWildRound.decision, 0, "first durable wild round must stay nonterminal");
assert.equal(state(wildRuntime).battle.turn, 2, "the same Battle object must advance to turn 2");
const carriedPlayerHp = Number(wildRuntime.player.party[0].hp);
const carriedFoeHp = Number(state(wildRuntime).battle.foe.hp);
assert.ok(carriedPlayerHp > 0 && carriedFoeHp > 0, "both combatants must survive the carryover turn");
wildRuntime.player.party[0].stats.ATTACK = 999;
wildRuntime.player.party[0].stats.SPEED = 999;
primeFoeAtOneHp(state(wildRuntime).battle);
const wildKo = await webPlayable.resolveSafariBattleRound(wildRuntime, wildMoveId);
assert.equal(wildKo.decision, 1, "wild KO must terminate from the Battle owner");
assert.equal(state(wildRuntime).battle.completed, true);
assert.equal(Number(state(wildRuntime).battle.foe.hp), 0);
assert.equal(Number(wildKo.player?.hp), carriedPlayerHp, "turn-2 Battle input must retain the player HP produced by turn 1");
const wildReturn = await webPlayable.returnSafariToDayBoard(wildRuntime);
assert.equal(wildReturn.target, "day_board");
assert.equal(state(wildRuntime).battle, null, "wild terminal Battle must return to the board without a stale Battle object");

// Trainer uses the same public web entry: first KO stays nonterminal, canonical
// replacement is applied once, final KO terminates, and the entry returns Board.
const trainerRuntime = createSafariPlayableRuntime();
prepareCell(trainerRuntime, { kind: "trainer", trainer_seed: 12345 });
const trainerResult = await webPlayable.activateSafariDayBoardCell(trainerRuntime, 0);
assertBattleStarted(trainerRuntime, trainerResult, "trainer");
assert.equal(demand.safariGeneralCombatReady("trainer"), true, "trainer cell must load the trainer owner");
assert.ok(state(trainerRuntime).battle.trainer_party?.length > 0, "trainer Battle must materialize its Party");
const trainerBattle = state(trainerRuntime).battle;
const first = structuredClone(trainerBattle.foe);
const reserve = structuredClone(trainerBattle.foe);
first.hp = 1;
first.fainted = false;
reserve.hp = Math.max(1, Number(reserve.max_hp ?? 1));
reserve.fainted = false;
reserve.active = false;
trainerBattle.trainer_party = [first, reserve];
trainerBattle.trainer_party_index = 0;
trainerBattle.trainer_party_order = [0, 1];
trainerBattle.foe = structuredClone(first);
const trainerMoveId = preparePlayerForKo(trainerRuntime);
const firstTrainerKo = await webPlayable.resolveSafariBattleRound(trainerRuntime, trainerMoveId);
assert.equal(firstTrainerKo.decision, 0, "trainer first KO with a reserve must remain nonterminal");
assert.equal(state(trainerRuntime).battle.completed, false);
assert.equal(state(trainerRuntime).battle.trainer_party_index, 1, "trainer replacement must advance through the Battle-owned continuation");
assert.ok(Number(state(trainerRuntime).battle.foe.hp) > 0, "replacement foe must be alive");
assert.equal((firstTrainerKo.operations ?? []).some((operation) => operation?.op === "trainer_send_next"), false, "Safari must not synthesize trainer replacement");
preparePlayerForKo(trainerRuntime);
primeFoeAtOneHp(state(trainerRuntime).battle);
const finalTrainerKo = await webPlayable.resolveSafariBattleRound(trainerRuntime, trainerMoveId);
assert.equal(finalTrainerKo.decision, 1, "trainer final KO must terminate once");
assert.equal(state(trainerRuntime).battle.completed, true);
const trainerReturn = await webPlayable.returnSafariToDayBoard(trainerRuntime);
assert.equal(trainerReturn.target, "day_board");
assert.equal(state(trainerRuntime).battle, null, "trainer terminal Battle must return to Board");

const failedRuntime = createSafariPlayableRuntime();
prepareCell(failedRuntime, { kind: "wild", type: "NOT_A_CANONICAL_TYPE" });
const failedState = state(failedRuntime);
const previousNotice = failedState.notice;
const previousCounter = failedState.preview_encounter_counter;
await assert.rejects(
  () => webPlayable.activateSafariDayBoardCell(failedRuntime, 0),
  /unknown General Encounter type/,
);
assert.equal(failedState.board_consumed[0], false, "failed Battle start must not consume the Day Board cell");
assert.equal(failedState.board_revealed[0], false, "failed Battle start must leave the Day Board cell retryable");
assert.equal(failedState.battle, null, "failed Battle start must not leave partial Battle state");
assert.equal(failedState.notice, previousNotice, "failed Battle start must restore the prior board notice");
assert.equal(failedState.preview_encounter_counter, previousCounter, "failed Battle start must roll back encounter RNG state");

console.log("Safari public web entry -> Battle start -> HP carryover -> KO/replacement -> board return: ok");
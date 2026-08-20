import assert from "node:assert/strict";
import { SAFARI_BATTLE_PHASE } from "../runtime/safari-battle-orchestrator.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const reserve = structuredClone(runtime.player.party[0]);
reserve.personal_id = Number(reserve.personal_id ?? 1) + 7300;
reserve.hp = reserve.max_hp;
reserve.moves = reserve.moves.map((move) => typeof move === "string" ? move : { ...move });
runtime.player.party.push(reserve);

state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";
const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.equal(Number(state.battle.player_party_index ?? 0), 0);

const active = runtime.player.party[0];
active.max_hp = Math.max(500, Number(active.max_hp ?? 1));
active.hp = 1;
active.stats.DEFENSE = 1;
active.stats.SPECIAL_DEFENSE = 1;
active.stats.SPEED = 1;
const activeMovesBefore = structuredClone(active.moves);

const healthyReserve = runtime.player.party[1];
healthyReserve.max_hp = Math.max(500, Number(healthyReserve.max_hp ?? 1));
healthyReserve.hp = healthyReserve.max_hp;
healthyReserve.stats.DEFENSE = 999;
healthyReserve.stats.SPECIAL_DEFENSE = 999;
healthyReserve.stats.SPEED = 999;

state.battle.foe.moves = [{ id: "SWIFT", ppup: 0, pp: 20 }];
state.battle.foe.stats.ATTACK = 999;
state.battle.foe.stats.SPECIAL_ATTACK = 999;
state.battle.foe.stats.SPEED = 999;

const turnBefore = Number(state.battle.turn ?? 1);
const capture = await web.attemptSafariCapture(runtime, {
  captureRandomSeed: 1,
  randomValues: [65535, 65535, 65535, 65535],
});
assert.equal(capture.result, "failed",
  "deterministic high capture rolls must keep the wild Battle active");
assert.equal(capture.turnConsumed ?? true, true);
assert.deepEqual(runtime.player.party[0].moves, activeMovesBefore,
  "a capture command must not consume player move PP");
assert.equal(Number(state.battle.turn), turnBefore + 1,
  "failed capture plus one foe response must consume exactly one Battle turn");
assert.equal(
  (capture.opponentResponse?.operations ?? []).filter((operation) => operation.op === "use_move" && operation.actor === "foe").length,
  1,
  "the foe must respond exactly once after a failed capture");
assert.equal(Number(runtime.player.party[0].hp), 0,
  "the opponent response after failed capture must be able to KO the active Pokemon");
assert.equal(Boolean(state.battle.player_replacement_required), true,
  "failed-capture response KO must enter the shared forced replacement owner");
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
  "central Battle orchestrator must stop at REPLACEMENT after capture-response KO");
assert.ok((state.battle.player_replacement_options ?? []).some((option) => Number(option.partyIndex) === 1),
  "the healthy reserve must be offered as a legal forced replacement");

const replacementTurn = Number(state.battle.turn);
const replacement = await web.replaceSafariBattlePlayer(runtime, 1);
assert.equal(replacement.result, "replaced");
assert.equal(Number(state.battle.player_party_index), 1);
assert.equal(Boolean(state.battle.player_replacement_required), false);
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(Number(state.battle.turn), replacementTurn,
  "forced replacement after capture failure must not consume another turn");

const selected = runtime.player.party[1];
selected.stats.ATTACK = 999;
selected.stats.SPECIAL_ATTACK = 999;
selected.stats.SPEED = 999;
state.battle.foe.hp = 1;
state.battle.foe.stats.DEFENSE = 1;
state.battle.foe.stats.SPECIAL_DEFENSE = 1;
const moveId = typeof selected.moves[0] === "string" ? selected.moves[0] : selected.moves[0]?.id;
assert.ok(moveId);
const final = await web.resolveSafariBattleRound(runtime, moveId);
assert.equal(final.decision, 1,
  "the forced replacement must be able to finish the same failed-capture Battle");
assert.equal(state.battle.completed, true);

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);
assert.equal(Boolean(state.board_consumed[0]), true);
assert.equal(Boolean(state.board_visited[0]), true);

console.log("Safari failed capture -> foe KO -> forced replacement -> victory -> Day Board return: PASS");

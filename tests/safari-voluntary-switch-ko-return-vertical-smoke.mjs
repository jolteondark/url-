import assert from "node:assert/strict";
import { SAFARI_BATTLE_PHASE } from "../runtime/safari-battle-orchestrator.js";
import { switchSafariNormalBattlePlayer } from "../runtime/safari-normal-battle-voluntary-switch.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const reserve = structuredClone(runtime.player.party[0]);
reserve.personal_id = Number(reserve.personal_id ?? 1) + 7100;
reserve.hp = 1;
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

const original = runtime.player.party[0];
original.max_hp = Math.max(500, Number(original.max_hp ?? 1));
original.hp = original.max_hp;
original.stats.DEFENSE = 999;
original.stats.SPECIAL_DEFENSE = 999;
original.stats.SPEED = 999;

runtime.player.party[1].hp = 1;
runtime.player.party[1].stats.DEFENSE = 1;
runtime.player.party[1].stats.SPECIAL_DEFENSE = 1;
runtime.player.party[1].stats.SPEED = 1;
state.battle.foe.moves = [{ id: "SWIFT", ppup: 0, pp: 20 }];
state.battle.foe.stats.ATTACK = 999;
state.battle.foe.stats.SPECIAL_ATTACK = 999;
state.battle.foe.stats.SPEED = 999;

const switched = switchSafariNormalBattlePlayer(runtime, 1);
assert.equal(switched.result, "switched");
assert.equal(switched.turnConsumed, true);
assert.equal(Number(state.battle.player_party_index), 1);
assert.equal(Number(runtime.player.party[1].hp), 0,
  "the opponent response after voluntary switch must be able to KO the switched-in Pokemon");
assert.equal(Boolean(state.battle.player_replacement_required), true,
  "KO after voluntary switch must enter the existing forced replacement owner");
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
  "central Battle orchestrator must stop at REPLACEMENT after the switched-in Pokemon faints");
assert.ok((state.battle.player_replacement_options ?? []).some((option) => Number(option.partyIndex) === 0),
  "the healthy switched-out Pokemon must be offered as a legal forced replacement");
assert.equal(
  (switched.opponentResponse?.operations ?? []).filter((operation) => operation.op === "use_move" && operation.actor === "foe").length,
  1,
  "the voluntary switch must still trigger exactly one foe response before replacement");

const replacement = await web.replaceSafariBattlePlayer(runtime, 0);
assert.equal(replacement.result, "replaced");
assert.equal(Number(state.battle.player_party_index), 0);
assert.equal(Boolean(state.battle.player_replacement_required), false);
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.COMMAND,
  "forced replacement after switch-KO must return to COMMAND without consuming another turn");

const active = runtime.player.party[0];
active.stats.ATTACK = 999;
active.stats.SPECIAL_ATTACK = 999;
active.stats.SPEED = 999;
state.battle.foe.hp = 1;
state.battle.foe.stats.DEFENSE = 1;
state.battle.foe.stats.SPECIAL_DEFENSE = 1;
const moveId = typeof active.moves[0] === "string" ? active.moves[0] : active.moves[0]?.id;
assert.ok(moveId);
const final = await web.resolveSafariBattleRound(runtime, moveId);
assert.equal(final.decision, 1, "replacement active must be able to finish the same Battle");
assert.equal(state.battle.completed, true);

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(state.location, "day_board");
assert.equal(state.battle, null,
  "terminal Battle return must clear the Battle and hand ownership back to the Day Board");
assert.equal(Boolean(state.board_consumed[0]), true);
assert.equal(Boolean(state.board_visited[0]), true);

console.log("Safari voluntary switch -> foe KO -> forced replacement -> victory -> Day Board return: PASS");

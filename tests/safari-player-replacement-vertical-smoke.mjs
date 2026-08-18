import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
assert.equal(typeof web.replaceSafariBattlePlayer, "function",
  "Safari facade must expose the shared player-replacement continuation owner");

const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const reserve = structuredClone(runtime.player.party[0]);
reserve.personal_id = Number(reserve.personal_id ?? 1) + 1000;
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
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);
assert.equal(Number(state.battle.player_party_index ?? 0), 0);

const active = runtime.player.party[0];
active.hp = 1;
active.stats.DEFENSE = 1;
active.stats.SPECIAL_DEFENSE = 1;
active.stats.SPEED = 1;
state.battle.foe.moves = [{ id: "SWIFT", ppup: 0, pp: 20 }];
state.battle.foe.stats.ATTACK = 999;
state.battle.foe.stats.SPECIAL_ATTACK = 999;
state.battle.foe.stats.SPEED = 999;
const moveId = typeof active.moves[0] === "string" ? active.moves[0] : active.moves[0]?.id;
assert.ok(moveId);

const turnBefore = Number(state.battle.turn ?? 1);
const ko = await web.resolveSafariBattleRound(runtime, moveId);
assert.equal(ko.decision, 0,
  "active KO with a usable reserve must remain a nonterminal Battle");
assert.ok(state.battle && !state.battle.completed);
assert.equal(Number(runtime.player.party[0].hp), 0, "fainted active must remain fainted");
assert.ok(Number(runtime.player.party[1].hp) > 0, "reserve must remain usable");
assert.equal(Boolean(state.mapless_run_end_pending), false,
  "usable reserve must never mark canonical all-fainted run end");
assert.equal(Boolean(ko.playerReplacementRequired ?? state.battle.player_replacement_required), true,
  "Battle handoff must require player replacement before another command");
const options = ko.playerReplacementOptions ?? state.battle.player_replacement_options;
assert.ok(Array.isArray(options), "replacement options must be exposed by the shared owner");
assert.ok(options.some((option) => Number(option.partyIndex ?? option.party_index ?? option) === 1),
  "usable reserve slot 1 must be a legal replacement option");

const replacement = await web.replaceSafariBattlePlayer(runtime, 1);
assert.equal(replacement.result, "replaced");
assert.equal(Number(state.battle.player_party_index), 1,
  "canonical replacement must update the active Party index");
assert.equal(Number(state.battle.turn), turnBefore + 1,
  "replacement selection itself must not consume an additional Battle turn");
assert.equal(Boolean(state.battle.player_replacement_required), false,
  "replacement requirement must clear after the canonical switch");
assert.ok(Number(runtime.player.party[1].hp) > 0);

// Prove the selected reserve owns the very next command and terminal reflection.
const selected = runtime.player.party[1];
selected.stats.ATTACK = 999;
selected.stats.SPECIAL_ATTACK = 999;
selected.stats.DEFENSE = 999;
selected.stats.SPECIAL_DEFENSE = 999;
selected.stats.SPEED = 999;
state.battle.foe.hp = 1;
const selectedMoveId = typeof selected.moves[0] === "string" ? selected.moves[0] : selected.moves[0]?.id;
const final = await web.resolveSafariBattleRound(runtime, selectedMoveId);
assert.equal(final.decision, 1, "replacement active must be able to finish the Battle");
assert.equal(state.battle.completed, true);
assert.equal(Number(state.battle.player_party_index), 1,
  "terminal reflection must stay attached to the selected reserve slot");
assert.equal(Boolean(state.mapless_run_end_pending), false);

console.log("Safari active KO -> legal reserve replacement -> next command -> victory: ok");

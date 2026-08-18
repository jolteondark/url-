import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const { finalizeNormalBattle } = await import("../runtime/safari-normal-battle-finalize.js");

const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const wildIndex = state.board_events.findIndex((event) => event?.kind === "wild");
assert.ok(wildIndex >= 0, "fresh Day Board must contain a wild cell");

const started = await web.activateSafariDayBoardCell(runtime, wildIndex);
assert.equal(started.result, "dispatched");
assert.equal(state.battle.kind, "wild");

// Model the exact handoff from safari-normal-battle-round: the round owner has
// already committed EXP to this persistent Pokemon and recorded that amount on
// battle.exp_gained before finalizeNormalBattle runs.
const playerIndex = Number(state.battle.player_party_index ?? 0);
const player = runtime.player.party[playerIndex];
const expBeforeRound = Number(player.exp ?? 0);
const committedByRound = 37;
player.exp = expBeforeRound + committedByRound;
state.battle.exp_gained = committedByRound;
state.battle.decision = 1;

const operations = finalizeNormalBattle(runtime);
assert.equal(Number(runtime.player.party[playerIndex].exp), expBeforeRound + committedByRound,
  "wild finalize must not award the already-committed round EXP a second time");
assert.equal(state.battle.exp_gained, committedByRound,
  "battle summary must preserve the round-owned EXP amount");
assert.equal(state.battle.completed, true);
assert.equal(state.board_consumed[wildIndex], true);
assert.ok(operations.some((operation) => operation.scope === "reward"),
  "wild victory reward still belongs to finalize");
assert.equal(operations.some((operation) => operation.scope === "exp"), false,
  "wild finalize must not run a second EXP flow");
const resultEvent = state.battle.presentation.findLast((event) => event?.type === "battle_result");
assert.equal(resultEvent?.expGained, committedByRound,
  "presentation must report the single round-owned EXP amount");

console.log("Safari ordinary wild EXP is committed exactly once before finalize: ok");

import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const { createSafariPlayableRuntime } = await import("../runtime/safari-web-startup.js");
const webPlayable = await import("../runtime/safari-web-playable-integration.js");

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = false;
state.board_consumed[0] = false;
state.battle = null;
state.location = "day_board";

await webPlayable.activateSafariDayBoardCell(runtime, 0);
assert.ok(state.battle, "wild Board activation must create Battle state");

const originalLead = structuredClone(runtime.player.party[0]);
const active = structuredClone(originalLead);
active.hp = Math.max(1, Number(active.max_hp ?? active.hp ?? 1));
active.stats.ATTACK = 999;
active.stats.SPEED = 999;
runtime.player.party = [structuredClone(originalLead), active];
state.battle.player_party_index = 1;
state.battle.player_party_order = [1, 0];

const inactiveHp = Number(runtime.player.party[0].hp);
const inactiveExp = Number(runtime.player.party[0].exp ?? 0);
const activeExpBefore = Number(runtime.player.party[1].exp ?? 0);
state.battle.foe.hp = 1;
state.battle.foe.fainted = false;
const selectedMoveId = typeof runtime.player.party[1].moves[0] === "string"
  ? runtime.player.party[1].moves[0]
  : runtime.player.party[1].moves[0]?.id;

const result = await webPlayable.resolveSafariBattleRound(runtime, selectedMoveId);
assert.equal(result.decision, 1, "active reserve should be able to finish the wild Battle");
assert.equal(state.battle.completed, true);
assert.equal(state.battle.player_party_index, 1, "direct wild owner must preserve the active Party slot");
assert.equal(Number(runtime.player.party[0].hp), inactiveHp, "wild round must not reflect active HP into slot 0");
assert.equal(Number(runtime.player.party[0].exp ?? 0), inactiveExp, "wild victory must not award active EXP to slot 0");
assert.ok(Number(runtime.player.party[1].exp ?? 0) > activeExpBefore, "wild victory EXP must be awarded to the active Party slot");

console.log("Safari direct normal wild owner preserves active slot through KO and EXP: ok");

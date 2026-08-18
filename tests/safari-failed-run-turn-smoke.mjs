import assert from "node:assert/strict";
import fs from "node:fs";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";

const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);

const playerIndex = Number(state.battle.player_party_index ?? 0);
const player = runtime.player.party[playerIndex];
player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
player.hp = player.max_hp;
player.stats.SPEED = 1;
player.stats.DEFENSE = 999;
player.stats.SPECIAL_DEFENSE = 999;
state.battle.foe.stats.SPEED = 999;
state.battle.foe.stats.ATTACK = 1;
state.battle.foe.stats.SPECIAL_ATTACK = 1;

const playerBefore = structuredClone(player);
const foeBefore = structuredClone(state.battle.foe);
const turnBefore = Number(state.battle.turn ?? 1);
const failed = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });

assert.equal(failed.escaped, false, "slow player with a high roll must exercise escape_failed");
assert.equal(failed.blocked, false, "probabilistic escape failure is not a blocked Run command");
assert.equal(failed.resolution.reason, "escape_failed");
assert.ok(state.battle && !state.battle.completed, "surviving a failed Run response must keep Battle active");
assert.equal(state.board_consumed[0], false, "failed Run must not consume the wild Board cell");
assert.equal(state.board_visited[0], false, "failed Run must not mark the wild Board cell visited");
assert.equal(Number(state.battle.turn), turnBefore + 1,
  "failed Run must consume exactly one player action and advance Battle once");
assert.equal(failed.opponentResponse?.playerActionConsumedWithoutMove, true,
  "failed Run must reuse the canonical opponent-only Battle response");
assert.equal(
  failed.opponentResponse?.ppIntegration?.commits?.filter((commit) => commit.actor === "player").length,
  0,
  "failed Run must not consume player move PP",
);
assert.equal(
  failed.opponentResponse?.ppIntegration?.commits?.filter((commit) => commit.actor === "foe").length,
  1,
  "failed Run must consume exactly one foe move PP through the Battle owner",
);
const playerAfter = runtime.player.party[Number(state.battle.player_party_index ?? 0)];
assert.ok(Number(playerAfter.hp) <= Number(playerBefore.hp),
  "opponent response after failed Run must not heal the active player");
assert.deepEqual(playerAfter.moves, playerBefore.moves,
  "failed Run itself must not consume player move PP");
assert.equal(playerAfter.status, playerBefore.status,
  "player status must remain reflected through the Battle runtime");
assert.equal(playerAfter.item ?? null, playerBefore.item ?? null,
  "player held item must remain reflected through the Battle runtime");
assert.equal(Number(state.battle.foe.hp), Number(foeBefore.hp),
  "failed Run must not damage the foe before its response");
assert.ok(Array.isArray(failed.presentation), "failed Run must expose opponent presentation to the UI");

const previewSource = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const fleeHandlerStart = previewSource.indexOf('byId("flee").addEventListener');
const fleeHandlerEnd = previewSource.indexOf('\nbyId("return-board").addEventListener', fleeHandlerStart);
assert.ok(fleeHandlerStart >= 0 && fleeHandlerEnd > fleeHandlerStart, "flee UI handler must exist");
const fleeHandler = previewSource.slice(fleeHandlerStart, fleeHandlerEnd);
assert.match(fleeHandler, /await playPresentation\(result\.presentation \?\? \[\]\)/,
  "failed Run UI must play the canonical opponent response presentation");

console.log("Safari failed Run -> canonical foe response -> next turn, Battle stays active: ok");

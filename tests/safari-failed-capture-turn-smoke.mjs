import assert from "node:assert/strict";
import fs from "node:fs";

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

const turnBefore = Number(state.battle.turn ?? 1);
const hpBefore = Number(runtime.player.party[Number(state.battle.player_party_index ?? 0)].hp);
const failed = await web.attemptSafariCapture(runtime, {
  captureRandomSeed: 1,
  randomValues: [65535, 65535, 65535, 65535],
});

assert.equal(failed.result, "failed", "high capture rolls must exercise the failed-capture path");
assert.ok(state.battle && !state.battle.completed, "failed capture must keep the wild Battle active");
assert.equal(state.board_consumed[0], false, "failed capture must not consume the Board cell");
assert.equal(
  Number(state.battle.turn),
  turnBefore + 1,
  "failed capture must consume exactly one player action and advance the Battle turn once",
);
assert.ok(
  Number(runtime.player.party[Number(state.battle.player_party_index ?? 0)].hp) <= hpBefore,
  "opponent response after failed capture must not heal the active player",
);

const previewSource = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const captureHandlerStart = previewSource.indexOf('byId("capture").addEventListener');
const captureHandlerEnd = previewSource.indexOf('\nbyId("flee").addEventListener', captureHandlerStart);
assert.ok(captureHandlerStart >= 0 && captureHandlerEnd > captureHandlerStart, "capture UI handler must exist");
const captureHandler = previewSource.slice(captureHandlerStart, captureHandlerEnd);
assert.doesNotMatch(
  captureHandler,
  /note\("捕獲先: " \+ result\.destination\)/,
  "failed capture UI must not print an undefined capture destination",
);

console.log("Safari failed capture -> opponent response -> next turn, Board remains active: ok");

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

const playerIndex = Number(state.battle.player_party_index ?? 0);
const playerBefore = structuredClone(runtime.player.party[playerIndex]);
const foeBefore = structuredClone(state.battle.foe);
const turnBefore = Number(state.battle.turn ?? 1);
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
assert.equal(failed.opponentResponse?.playerActionConsumedWithoutMove, true, "capture must consume the player action without synthesizing a player move");
assert.equal(
  failed.opponentResponse?.ppIntegration?.commits?.filter((commit) => commit.actor === "player").length,
  0,
  "failed capture must not consume player move PP",
);
assert.equal(
  failed.opponentResponse?.ppIntegration?.commits?.filter((commit) => commit.actor === "foe").length,
  1,
  "the canonical opponent response must consume exactly one foe move PP",
);
const playerAfter = runtime.player.party[Number(state.battle.player_party_index ?? 0)];
assert.ok(Number(playerAfter.hp) <= Number(playerBefore.hp), "opponent response after failed capture must not heal the active player");
assert.deepEqual(playerAfter.moves, playerBefore.moves, "failed capture itself must not mutate player move PP");
assert.equal(playerAfter.status, playerBefore.status, "player status must remain reflected through the Battle runtime");
assert.equal(playerAfter.item ?? null, playerBefore.item ?? null, "player held item must remain reflected through the Battle runtime");
assert.equal(Number(state.battle.foe.hp), Number(foeBefore.hp), "failed capture must not damage the foe before its response");
assert.equal(state.battle.completed, false, "surviving a failed capture response must continue Battle");

assert.equal(failed.presentation?.[0]?.type, "capture",
  "presentation must show the consumed capture action before the foe response");
assert.equal(failed.presentation?.[0]?.result, "failed");
assert.equal(failed.presentation?.[0]?.targetSpecies, foeBefore.species,
  "failed capture narration must retain the targeted species");
const foeActionIndex = failed.presentation.findIndex((event) => event.type === "move_started" && event.actor === "foe");
assert.ok(foeActionIndex > 0, "canonical foe response must follow the failed capture narration");

const previewSource = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const captureHandlerStart = previewSource.indexOf('byId("capture").addEventListener');
const captureHandlerEnd = previewSource.indexOf('\nbyId("flee").addEventListener', captureHandlerStart);
assert.ok(captureHandlerStart >= 0 && captureHandlerEnd > captureHandlerStart, "capture UI handler must exist");
const captureHandler = previewSource.slice(captureHandlerStart, captureHandlerEnd);
const caughtBranch = captureHandler.indexOf('result.result === "caught"');
const destinationRead = captureHandler.indexOf('result.destination');
assert.ok(caughtBranch >= 0, "capture UI must branch on caught before reading destination");
assert.ok(destinationRead > caughtBranch, "capture destination must only be read after the caught-result branch");
assert.match(captureHandler, /else note\("Capture: " \+ result\.result\)/, "failed capture UI must render the failed result without a destination");
assert.match(captureHandler, /await playPresentation\(result\.presentation\)/,
  "capture UI must play the ordered capture-action + foe-response presentation queue");

console.log("Safari failed capture -> visible capture failure -> canonical foe response -> next turn: ok");

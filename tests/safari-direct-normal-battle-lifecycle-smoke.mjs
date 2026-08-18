import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

const facadeSource = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
assert.match(facadeSource, /safari-normal-battle-lifecycle\.js\?v=/,
  "normal capture/return must load the direct lifecycle owner");
assert.doesNotMatch(facadeSource, /normalLifecycleModulePromise\s*=\s*import\("\.\/safari-playable-integration-pre-wounded\.js"\)/,
  "normal capture/return must not re-enter the pre-wounded migration chain");

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

const partyBefore = runtime.player.party.length;
const storedBefore = runtime.storage_system.boxes.reduce(
  (sum, box) => sum + box.slots.filter(Boolean).length,
  0,
);

const capture = await web.attemptSafariCapture(runtime);
assert.equal(capture.result, "caught", "deterministic Safari capture fixture must be caught");
assert.equal(state.battle.completed, true, "caught wild must complete Battle");
assert.equal(state.battle.decision, 4, "capture must retain canonical capture decision");
assert.equal(state.battle.captured, true);
assert.equal(state.board_consumed[0], true, "capture must complete the Board wild event");
assert.match(state.notice, /捕まえました。$/, "capture completion must not be reported as defeat");
assert.ok(
  runtime.player.party.length > partyBefore || runtime.storage_system.boxes.reduce((sum, box) => sum + box.slots.filter(Boolean).length, 0) > storedBefore,
  "caught Pokemon must route to Party or Storage",
);
assert.ok(capture.presentation.some((event) => event.type === "capture" && event.result === "caught"));
assert.ok(capture.presentation.some((event) => event.type === "battle_result" && event.captured === true && event.decision === 4));

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.result, "returned");
assert.equal(returned.target, "day_board");
assert.equal(returned.summary.decision, 4);
assert.equal(returned.summary.captured, true);
assert.equal(state.battle, null);
assert.equal(state.location, "day_board");
assert.equal(state.notice, "Day Boardへ戻りました。");

console.log("Safari direct normal lifecycle: capture -> Board completion -> Party/Storage -> return: ok");

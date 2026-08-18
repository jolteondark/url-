import assert from "node:assert/strict";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;

state.mapless_run_active = true;
state.mapless_run_prepared = true;
state.mapless_run_end_pending = false;
state.mapless_carryover_pending = false;
state.mapless_carryover_overflow = false;
runtime.bag.slots = [["POTION", 2]];
runtime.bag.money = 777;

state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";

const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);

// One usable Pokemon. Exercise the real failed-Run opponent-only path and make
// that single canonical foe response KO the Party. SWIFT has canonical
// accuracy 0 in the Safari projection, so the terminal fixture cannot miss.
assert.equal(runtime.player.party.length, 1);
const player = runtime.player.party[0];
player.hp = 1;
player.stats.DEFENSE = 1;
player.stats.SPECIAL_DEFENSE = 1;
player.stats.SPEED = 1;
state.battle.foe.moves = [{ id: "SWIFT", ppup: 0, pp: 20 }];
state.battle.foe.stats.ATTACK = 999;
state.battle.foe.stats.SPECIAL_ATTACK = 999;
state.battle.foe.stats.SPEED = 999;

const defeatedPartySnapshot = structuredClone(runtime.player.party);
const storedBefore = runtime.storage_system.boxes.reduce(
  (sum, box) => sum + box.slots.filter(Boolean).length,
  0,
);
const failed = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });
assert.equal(failed.escaped, false);
assert.equal(failed.blocked, false);
assert.equal(failed.resolution.reason, "escape_failed");
assert.equal(failed.opponentResponse?.playerActionConsumedWithoutMove, true,
  "run-end defeat must originate from the canonical opponent-only failed-action response");
assert.equal(failed.opponentResponse?.decision, 2,
  "last usable Pokemon KO must resolve canonical defeat decision 2");
assert.equal(state.battle?.completed, true, "defeat must complete Battle exactly once");
assert.equal(state.battle?.decision, 2);
assert.equal(state.mapless_run_end_pending, true,
  "canonical after_battle stage must mark run end before finish_run cleanup");
assert.equal(state.battle?.return_target, "home",
  "all-fainted defeat must route the completed Battle toward Mapless home, not Day Board");
assert.equal(state.mapless_run_active, true,
  "Battle result presentation must retain the defeated run until finish_run transition");
assert.equal(runtime.player.party.length, defeatedPartySnapshot.length,
  "defeated Party must remain present while the Battle result is being presented");
assert.ok(failed.presentation?.some((event) => event.type === "faint" && event.target === "player"));
assert.equal(failed.presentation?.filter((event) => event.type === "battle_result" && event.decision === 2).length, 1,
  "terminal failed-action path must emit exactly one defeat result");

// Browser adaptation of canonical MaplessCarryover.finish_run: dismissing the
// completed result performs the deferred archive/reset and enters home.
const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.target, "home", "run-end result must transition to home");
assert.equal(state.battle, null);
assert.equal(state.location, "home");
assert.equal(state.mapless_run_end_pending, false, "finish_run must clear pending marker");
assert.equal(state.mapless_run_active, false, "finish_run must close the active run");
assert.equal(state.mapless_run_prepared, false, "finished run must no longer be prepared");
assert.equal(state.mapless_carryover_pending, true,
  "finished run must wait for explicit next-run carryover selection");
assert.equal(state.mapless_carryover_overflow, false,
  "empty Box fixture must archive the defeated Party without overflow");
assert.equal(runtime.player.party.length, 0,
  "finished run Party must be archived before next-run carryover selection");
const storedAfter = runtime.storage_system.boxes.reduce(
  (sum, box) => sum + box.slots.filter(Boolean).length,
  0,
);
assert.equal(storedAfter, storedBefore + defeatedPartySnapshot.length,
  "defeated Party must archive through the existing Storage owner");
assert.deepEqual(runtime.bag.slots, [], "finish_run must clear Bag contents");
assert.equal(runtime.bag.money, 0, "finish_run must clear Money");
assert.equal(returned.persistenceRequested, true,
  "canonical finish_run transition must request persistence");

console.log("Safari failed Run -> last Pokemon KO -> mark run end -> finish/carryover home: ok");

import assert from "node:assert/strict";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;

// Canonical MaplessCarryover tracks an active/prepared run separately from
// carryover-pending. Seed those canonical state flags explicitly so this test
// remains focused on the defeat -> finish_run boundary while startup adoption
// can be implemented in the same change.
state.mapless_run_active = true;
state.mapless_run_prepared = true;
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

// There is exactly one usable player Pokemon. Force failed Run, then make the
// canonical opponent-only response KO it. This is the real #262 path, not a
// synthetic defeat call.
assert.equal(runtime.player.party.length, 1, "fixture must start with one usable Pokemon");
const player = runtime.player.party[0];
player.hp = 1;
player.stats.DEFENSE = 1;
player.stats.SPECIAL_DEFENSE = 1;
player.stats.SPEED = 1;
state.battle.foe.moves = [{ id: "TACKLE", ppup: 0, pp: 35 }];
state.battle.foe.stats.ATTACK = 999;
state.battle.foe.stats.SPECIAL_ATTACK = 999;
state.battle.foe.stats.SPEED = 999;

const storedBefore = runtime.storage_system.boxes.reduce(
  (sum, box) => sum + box.slots.filter(Boolean).length,
  0,
);
const failed = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });
assert.equal(failed.escaped, false);
assert.equal(failed.blocked, false);
assert.equal(failed.resolution.reason, "escape_failed");
assert.equal(failed.opponentResponse?.playerActionConsumedWithoutMove, true,
  "all-fainted run end must originate from the canonical opponent-only failed-action response");
assert.equal(failed.opponentResponse?.decision, 2,
  "last usable Pokemon KO must resolve canonical defeat decision 2");
assert.equal(state.battle?.completed, true, "defeat must complete the Battle exactly once");
assert.equal(state.battle?.decision, 2);

// Canonical source-v0.9.108 MaplessCarryover.finish_run contract.
assert.equal(state.mapless_run_active, false, "all-fainted defeat must close the active run");
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
assert.equal(storedAfter, storedBefore + 1, "defeated Party must archive to existing Storage owner");
assert.deepEqual(runtime.bag.slots, [], "finished run must clear Bag contents");
assert.equal(runtime.bag.money, 0, "finished run must clear Money");
assert.equal(state.battle?.return_target, "home",
  "all-fainted defeat must not offer a Day Board return");
assert.ok(failed.presentation?.some((event) => event.type === "faint" && event.target === "player"),
  "terminal opponent response must retain player faint presentation");
assert.equal(failed.presentation?.filter((event) => event.type === "battle_result" && event.decision === 2).length, 1,
  "terminal failed-action path must emit exactly one defeat result");

console.log("Safari failed Run -> last Pokemon KO -> canonical run end/carryover pending: ok");

import assert from "node:assert/strict";
import {
  activateSafariDayBoardCell,
  attemptSafariCapture,
  boardCellPresentation,
  createSafariPlayableRuntime,
  loadSafariPlayableRun,
  resolveSafariBattleRound,
  returnSafariToDayBoard,
  saveSafariPlayableRun,
} from "../runtime/safari-playable-integration.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function state(runtime) {
  return runtime.variables.mapless;
}

let runtime = createSafariPlayableRuntime();
assert.equal(state(runtime).day, 1);
assert.equal(state(runtime).board_events.length, 8);
assert.equal(state(runtime).board_events.filter((event) => event.kind === "next_day").length, 1);
assert.ok(Array.from({ length: 8 }, (_, index) => boardCellPresentation(runtime, index)).every((cell) => cell.label === "？？？"));

const firstWild = state(runtime).board_events.findIndex((event) => event.kind === "wild");
const started = activateSafariDayBoardCell(runtime, firstWild);
assert.equal(started.result, "dispatched");
assert.equal(state(runtime).battle.kind, "wild");
assert.equal(state(runtime).board_revealed[firstWild], true);
// The launch plan requests consumption, while the split-phase browser adapter
// commits it through the existing wild result lifecycle.
assert.equal(state(runtime).board_consumed[firstWild], false);
assert.equal("species_id" in state(runtime).board_events[firstWild], false);
assert.deepEqual(state(runtime).battle.encounter_request, {
  required_type: "ELECTRIC",
  day: 1,
  enemy_rank: "NORMAL",
  extra_modifier: 0,
  use_variance: true,
});
assert.equal(state(runtime).battle.encounter.source, "generated_browser_projection");
assert.equal(state(runtime).battle.encounter.species_id, "PIKACHU");
assert.equal(state(runtime).battle.encounter.level, 5);
assert.ok(started.operations.some((operation) => operation.op === "create_general_type_encounter"));
assert.ok(started.operations.some((operation) => operation.op === "start_wild_battle"));
assert.deepEqual(state(runtime).battle.encounter_cleanup, [{ op: "clear_battle_rules" }]);

let lastRound;
for (let turn = 0; turn < 10 && !state(runtime).battle.completed; turn += 1) {
  lastRound = resolveSafariBattleRound(runtime, "TACKLE");
}
assert.equal(state(runtime).battle.decision, 1);
assert.equal(state(runtime).board_consumed[firstWild], true);
assert.equal(runtime.player.party[0].level, 10);
assert.equal(runtime.player.party[0].exp, 1070);
assert.ok(runtime.player.party[0].moves.some((move) => move.id === "QUICKATTACK"));
assert.equal(runtime.player.party[0].moves.find((move) => move.id === "TACKLE").pp, 32);
assert.equal(state(runtime).battle.foe.moves[0].pp, 28);
assert.deepEqual(runtime.bag.slots, [["POTION", 1]]);
const completedWildActivation = state(runtime).last_operations.find((operation) => operation.op === "activate_wild_cell")?.resolved;
assert.ok(completedWildActivation);
assert.deepEqual(
  completedWildActivation.operations.filter((operation) => operation.op === "clear_battle_rules"),
  state(runtime).battle.encounter_cleanup,
);
assert.ok(lastRound.operations.some((operation) => operation.op === "calc_damage"));
assert.deepEqual(lastRound.ppIntegration.commits.map((commit) => commit.actor), ["player"]);
assert.ok(lastRound.presentation.some((event) => event.type === "damage_applied"));
assert.ok(lastRound.presentation.some((event) => event.type === "battle_result"));

returnSafariToDayBoard(runtime);
assert.equal(state(runtime).battle, null);

const secondWild = state(runtime).board_events.findIndex((event, index) => event.kind === "wild" && index !== firstWild);
activateSafariDayBoardCell(runtime, secondWild);
const captured = attemptSafariCapture(runtime);
assert.equal(captured.result, "caught");
assert.equal(captured.destination, "party");
assert.equal(captured.calculation.numShakes, 4);
assert.equal(captured.calculation.randomUsed, 4);
assert.ok(captured.calculation.x < 255);
assert.equal(runtime.player.party.length, 2);
assert.equal(state(runtime).board_consumed[secondWild], true);
returnSafariToDayBoard(runtime);

const storage = new MemoryStorage();
const saved = saveSafariPlayableRun(storage, runtime);
assert.ok(saved.operations.some((operation) => operation.op === "storage_set"));
runtime.variables.mapless.day = 99;
const loaded = loadSafariPlayableRun(storage, runtime);
assert.equal(loaded.found, true);
runtime = loaded.state;
assert.equal(state(runtime).day, 1);
assert.equal(runtime.player.party.length, 2);
assert.ok(runtime.player.party[0].moves.find((move) => move.id === "TACKLE").pp < 35);

const nextDay = state(runtime).board_events.findIndex((event) => event.kind === "next_day");
const advanced = activateSafariDayBoardCell(runtime, nextDay);
assert.equal(advanced.result, "day_advanced");
assert.equal(state(runtime).day, 2);
assert.equal(state(runtime).board_events.length, 8);
assert.ok(state(runtime).board_revealed.every((value) => value === false));

while (runtime.player.party.length < 6) {
  runtime.player.party.push(structuredClone(runtime.player.party[0]));
}
const dayTwoWild = state(runtime).board_events.findIndex((event) => event.kind === "wild");
activateSafariDayBoardCell(runtime, dayTwoWild);
const boxed = attemptSafariCapture(runtime);
assert.equal(boxed.destination, "box");
assert.equal(runtime.player.party.length, 6);
assert.equal(runtime.storage_system.boxes[0].slots.filter(Boolean).length, 1);

console.log(JSON.stringify({
  day: state(runtime).day,
  party: runtime.player.party.length,
  boxed: runtime.storage_system.boxes[0].slots.filter(Boolean).length,
  potion: runtime.bag.slots[0][1],
  vertical: "day_board_wild_request_encounter_launch_battle_result_persistence_return",
}));

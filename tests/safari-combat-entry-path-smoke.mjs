import assert from "node:assert/strict";

// Keep safari-general-data-demand on its browser path. In Node it otherwise
// preloads both combat modules at module evaluation time for legacy fixtures.
globalThis.window = {};

const demand = await import("../runtime/safari-general-data-demand.js");
const { createSafariPlayableRuntime } = await import("../runtime/safari-web-startup.js");
const { activateSafariWebCombatCell } = await import("../runtime/safari-web-combat-start.js");

function state(runtime) {
  return runtime.variables.mapless;
}

function prepareCell(runtime, event) {
  const current = state(runtime);
  current.board_events[0] = { ...event, slot: 0 };
  current.board_revealed[0] = false;
  current.board_consumed[0] = false;
  current.battle = null;
  current.shop = null;
  current.location = "day_board";
}

function assertBattleStarted(runtime, result, kind) {
  const battle = state(runtime).battle;
  assert.equal(result.result, "dispatched");
  assert.equal(result.boundary, kind);
  assert.ok(battle, `${kind} Day Board activation must create Battle state`);
  assert.equal(battle.kind, kind);
  assert.equal(battle.completed, false);
  assert.equal(battle.decision, 0);
  assert.ok(battle.foe?.species, `${kind} Battle must materialize an opponent owner`);
  assert.ok(Array.isArray(battle.foe?.moves) && battle.foe.moves.length > 0, `${kind} opponent must have canonical moves`);
  assert.ok(battle.last_operations.some((operation) => operation.op === "scene_start_battle"), `${kind} path must enter the Battle scene owner`);
  assert.ok(battle.last_operations.some((operation) => operation.op === "battle_loop_handoff"), `${kind} path must hand off to the Battle loop owner`);
}

assert.equal(demand.safariGeneralCombatReady(), false);
assert.equal(demand.safariGeneralCombatReady("wild"), false);
assert.equal(demand.safariGeneralCombatReady("trainer"), false);

const wildRuntime = createSafariPlayableRuntime();
prepareCell(wildRuntime, { kind: "wild", type: "BUG" });
const wildResult = await activateSafariWebCombatCell(wildRuntime, 0);
assertBattleStarted(wildRuntime, wildResult, "wild");
assert.equal(demand.safariGeneralCombatReady("wild"), true, "wild cell must load the encounter owner");
assert.equal(demand.safariGeneralCombatReady("trainer"), false, "wild cell must not require the trainer generator");

const trainerRuntime = createSafariPlayableRuntime();
prepareCell(trainerRuntime, { kind: "trainer", trainer_seed: 12345 });
const trainerResult = await activateSafariWebCombatCell(trainerRuntime, 0);
assertBattleStarted(trainerRuntime, trainerResult, "trainer");
assert.equal(demand.safariGeneralCombatReady("trainer"), true, "trainer cell must load the trainer owner");
assert.ok(state(trainerRuntime).battle.trainer_party?.length > 0, "trainer Battle must materialize its Party");

const failedRuntime = createSafariPlayableRuntime();
prepareCell(failedRuntime, { kind: "wild", type: "NOT_A_CANONICAL_TYPE" });
const failedState = state(failedRuntime);
const previousNotice = failedState.notice;
const previousCounter = failedState.preview_encounter_counter;
await assert.rejects(
  () => activateSafariWebCombatCell(failedRuntime, 0),
  /unknown General Encounter type/,
);
assert.equal(failedState.board_consumed[0], false, "failed Battle start must not consume the Day Board cell");
assert.equal(failedState.board_revealed[0], false, "failed Battle start must leave the Day Board cell retryable");
assert.equal(failedState.battle, null, "failed Battle start must not leave partial Battle state");
assert.equal(failedState.notice, previousNotice, "failed Battle start must restore the prior board notice");
assert.equal(failedState.preview_encounter_counter, previousCounter, "failed Battle start must roll back encounter RNG state");

console.log("Safari Day Board -> GENERAL demand -> Battle start: ok");

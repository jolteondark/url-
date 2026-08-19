import assert from "node:assert/strict";
import { finalizeNormalBattle } from "../runtime/safari-normal-battle-finalize.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-playable-integration.js");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const moveId = (move) => typeof move === "string" ? move : move?.id;
const opList = (operations = []) => {
  const out = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.op) out.push(value);
    if (value.resolved) visit(value.resolved);
    if (Array.isArray(value.operations)) value.operations.forEach(visit);
  };
  operations.forEach(visit);
  return out;
};
function preparePlayer(runtime) {
  const player = runtime.player.party[0];
  player.hp = Math.max(1, Number(player.max_hp ?? player.hp ?? 1));
  player.stats.ATTACK = 99999;
  player.stats.SPECIAL_ATTACK = 99999;
  player.stats.SPEED = 99999;
  return moveId(player.moves[0]);
}
function primeFoe(battle) {
  battle.foe.hp = 1;
  battle.foe.fainted = false;
  battle.foe.stats.SPEED = 1;
  battle.foe.stats.ATTACK = 1;
  battle.foe.stats.SPECIAL_ATTACK = 1;
  if (battle.kind === "trainer") battle.trainer_party[battle.trainer_party_index] = structuredClone(battle.foe);
}
function resultOrder(result) {
  return (result.presentation ?? []).map((event) => event.type);
}
function assertPhaseOrder(history, expected) {
  let previous = -1;
  for (const phase of expected) {
    const index = history.indexOf(phase, previous + 1);
    assert.ok(index > previous, `expected lifecycle phase ${phase} after ${expected[Math.max(0, expected.indexOf(phase) - 1)] ?? "start"}`);
    previous = index;
  }
}

const trace = [];

// Wild last foe KO -> faint -> one EXP commit -> automatic level/move/evolution tail
// (when supplied by Battle Systems) -> reward -> Board completion/save -> Result -> Return.
{
  const runtime = web.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  const index = state.board_events.findIndex((event) => event?.kind === "wild");
  assert.notEqual(index, -1);
  await Promise.resolve(web.activateSafariDayBoardCell(runtime, index));
  assert.equal(state.battle.lifecycle_phase, "command", "fresh normal Battle must expose only command phase");
  const move = preparePlayer(runtime);
  primeFoe(state.battle);
  const expBefore = Number(runtime.player.party[0].exp ?? 0);
  const bagBefore = structuredClone(runtime.bag.slots);

  const result = await Promise.resolve(web.resolveSafariBattleRound(runtime, move));
  const operations = opList(result.operations);
  const types = resultOrder(result);
  const faintAt = types.indexOf("faint");
  const resultAt = types.indexOf("battle_result");
  assert.equal(result.decision, 1);
  assert.ok(faintAt >= 0 && resultAt > faintAt, "faint presentation must precede the terminal Result");
  assert.equal(types.slice(faintAt + 1, resultAt).includes("move_started"), false, "KOed foe may not act after faint");
  assert.equal(result.expIntegration?.commits?.length, 1, "last foe KO must create exactly one EXP commit");
  const gained = Number(result.expIntegration.commits[0].expGained ?? 0);
  assert.equal(Number(runtime.player.party[0].exp ?? 0), expBefore + gained);
  assert.equal(state.battle.lifecycle_phase, "completed");
  assert.equal(state.battle.terminal_finalize_applied, true);
  assertPhaseOrder(state.battle.lifecycle_history ?? [], ["resolving_action", "post_faint", "post_victory", "completed"]);
  assert.equal(state.board_consumed[index], true);
  assert.equal(state.board_visited[index], true);
  assert.equal(operations.filter((op) => op.op === "request_save").length, 1);
  assert.equal((result.presentation ?? []).filter((event) => event.type === "battle_result").length, 1);
  assert.notDeepEqual(runtime.bag.slots, bagBefore, "terminal wild reward must be committed before Return");

  const rewardAt = operations.findIndex((op) => op.scope === "reward");
  const visitedAt = operations.findIndex((op) => op.op === "set_board_visited");
  const saveAt = operations.findIndex((op) => op.op === "request_save");
  assert.ok(rewardAt >= 0 && visitedAt > rewardAt && saveAt > visitedAt,
    "trace must order reward -> Board visited -> request_save before Result presentation");

  // Exact terminal idempotence is owned by finalizeNormalBattle itself, not only by
  // the later Return facade. A duplicate call may not replay reward/Board/save/Result.
  const idempotentBag = structuredClone(runtime.bag);
  const idempotentConsumed = structuredClone(state.board_consumed);
  const idempotentVisited = structuredClone(state.board_visited);
  const idempotentResultCount = state.battle.presentation.filter((event) => event.type === "battle_result").length;
  assert.deepEqual(finalizeNormalBattle(runtime), [], "terminal finalize must be explicitly idempotent");
  assert.deepEqual(runtime.bag, idempotentBag);
  assert.deepEqual(state.board_consumed, idempotentConsumed);
  assert.deepEqual(state.board_visited, idempotentVisited);
  assert.equal(state.battle.presentation.filter((event) => event.type === "battle_result").length, idempotentResultCount);

  const resultStorage = new MemoryStorage();
  web.saveSafariPlayableRun(resultStorage, runtime);
  const loadedAtResult = web.loadSafariPlayableRun(resultStorage, web.createSafariPlayableRuntime()).state;
  assert.equal(loadedAtResult.variables.mapless.battle?.completed, true, "Save/Continue at Result must preserve completed Battle");
  assert.equal(loadedAtResult.variables.mapless.battle?.lifecycle_phase, "completed");
  assert.equal(loadedAtResult.variables.mapless.board_consumed[index], true);
  assert.equal(loadedAtResult.variables.mapless.board_visited[index], true);

  const rewardSnapshot = structuredClone(runtime.bag);
  const consumedSnapshot = structuredClone(state.board_consumed);
  const returned = web.returnSafariToDayBoard(runtime);
  assert.equal(returned.target, "day_board");
  assert.equal(state.battle, null);
  assert.equal(state.location, "day_board");
  assert.equal(state.board_consumed[index], true);
  assert.equal(state.board_visited[index], true);
  assert.throws(() => web.returnSafariToDayBoard(runtime), /completed battle is required/,
    "a second Return may not replay reward/Board finalization");
  assert.deepEqual(runtime.bag, rewardSnapshot, "double Return must not duplicate reward");
  assert.deepEqual(state.board_consumed, consumedSnapshot, "double Return must not consume Board twice");
  assert.ok(state.board_events.some((event, i) => event && !state.board_consumed[i]), "Day Board must remain actionable after Return");

  const returnStorage = new MemoryStorage();
  web.saveSafariPlayableRun(returnStorage, runtime);
  const loadedAfterReturn = web.loadSafariPlayableRun(returnStorage, web.createSafariPlayableRuntime()).state;
  assert.equal(loadedAfterReturn.variables.mapless.battle, null, "Save/Continue after Return must not resurrect Result Battle");
  assert.equal(loadedAfterReturn.variables.mapless.location, "day_board");
  assert.deepEqual(loadedAfterReturn.variables.mapless.board_consumed, state.board_consumed);
  assert.deepEqual(loadedAfterReturn.variables.mapless.board_visited, state.board_visited);

  trace.push({ scenario: "wild_terminal", operations, presentation: result.presentation, phases: result.runtime.variables.mapless.last_battle_lifecycle ?? null, result: result.decision, returned: returned.target });
}

// Trainer reserve KO stays in post-faint/send-out and returns to COMMAND. Only the
// final KO may enter post_victory and finalize prize/reward/Board/Result.
{
  const runtime = web.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  const index = state.board_events.findIndex((event) => event?.kind === "trainer");
  assert.notEqual(index, -1);
  await Promise.resolve(web.activateSafariDayBoardCell(runtime, index));
  const move = preparePlayer(runtime);
  const first = structuredClone(state.battle.foe);
  const reserve = structuredClone(state.battle.foe);
  first.hp = 1;
  first.fainted = false;
  reserve.hp = Math.max(1, Number(reserve.max_hp ?? 1));
  reserve.fainted = false;
  reserve.active = false;
  state.battle.trainer_party = [first, reserve];
  state.battle.trainer_party_index = 0;
  state.battle.trainer_party_order = [0, 1];
  state.battle.foe = structuredClone(first);

  const firstKo = await Promise.resolve(web.resolveSafariBattleRound(runtime, move));
  assert.equal(firstKo.decision, 0);
  assert.equal(state.battle.completed, false);
  assert.equal(state.battle.lifecycle_phase, "command", "trainer send-out tail must finish before the next command unlocks");
  assert.equal(Boolean(state.battle.terminal_finalize_applied), false, "reserve KO must not enter terminal finalize");
  assertPhaseOrder(state.battle.lifecycle_history ?? [], ["resolving_action", "post_faint", "command"]);
  assert.equal(state.board_consumed[index], false);
  assert.equal(state.board_visited[index], false);
  assert.equal((firstKo.presentation ?? []).filter((event) => event.type === "battle_result").length, 0);
  assert.equal((firstKo.presentation ?? []).filter((event) => event.type === "trainer_next").length, 1);
  assert.equal((firstKo.presentation ?? []).slice((firstKo.presentation ?? []).findIndex((event) => event.type === "faint") + 1)
    .some((event) => event.type === "move_started" && event.actor === "foe"), false,
  "trainer reserve may be sent out but may not act in the KO round");
  assert.equal(firstKo.expIntegration?.commits?.length, 1);
  const cumulativeAfterFirst = Number(state.battle.trainer_exp_gained ?? 0);
  assert.ok(cumulativeAfterFirst > 0);

  preparePlayer(runtime);
  primeFoe(state.battle);
  const finalKo = await Promise.resolve(web.resolveSafariBattleRound(runtime, move));
  const finalOps = opList(finalKo.operations);
  assert.equal(finalKo.decision, 1);
  assert.equal(state.battle.completed, true);
  assert.equal(state.battle.lifecycle_phase, "completed");
  assert.equal(state.battle.terminal_finalize_applied, true);
  assertPhaseOrder(state.battle.lifecycle_history ?? [], ["post_faint", "post_victory", "completed"]);
  assert.equal(finalKo.expIntegration?.commits?.length, 1);
  assert.ok(Number(state.battle.trainer_exp_gained ?? 0) >= cumulativeAfterFirst);
  assert.equal(finalOps.filter((op) => op.op === "trainer_prize_money").length, 1);
  assert.equal(finalOps.filter((op) => op.op === "request_save").length, 1);
  assert.equal(state.board_consumed[index], true);
  assert.equal(state.board_visited[index], true);
  assert.equal((finalKo.presentation ?? []).filter((event) => event.type === "battle_result").length, 1);
  assert.deepEqual(finalizeNormalBattle(runtime), [], "trainer terminal finalize must also be idempotent");

  trace.push({ scenario: "trainer_terminal", first: { operations: firstKo.operations, presentation: firstKo.presentation }, final: { operations: finalOps, presentation: finalKo.presentation } });
}

console.log("Safari post-KO lifecycle state/operations/presentation trace:", JSON.stringify(trace));

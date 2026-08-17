import assert from "node:assert/strict";
import {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} from "../runtime/safari-playable-integration-ai.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function preparePlayerForKo(runtime) {
  const player = runtime.player.party[0];
  player.hp = Math.max(1, Number(player.max_hp ?? player.hp ?? 1));
  player.stats.ATTACK = Math.max(999, Number(player.stats.ATTACK ?? 0));
  player.stats.SPEED = Math.max(999, Number(player.stats.SPEED ?? 0));
  return moveId(player.moves[0]);
}

function primeFoeAtOneHp(battle) {
  battle.foe.hp = 1;
  battle.foe.fainted = false;
  if (Array.isArray(battle.trainer_party) && Number.isInteger(battle.trainer_party_index)) {
    battle.trainer_party[battle.trainer_party_index] = structuredClone(battle.foe);
  }
}

function assertImmediateKoPresentation(result, expectedSemanticTypes) {
  assert.equal(result.safariKoPresentationImmediate, true);
  const types = (result.presentation ?? []).map((event) => event.type);
  assert.equal(types.includes("move_started"), false, "KO round must not replay timed old-target move animation");
  assert.equal(types.includes("damage_applied"), false, "KO round must not replay timed old-target HP animation");
  for (const type of expectedSemanticTypes) assert.equal(types.includes(type), true, `missing ${type} semantic event`);
}

// Wild terminal KO through the same AI facade selected by index.html importmap.
{
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  const index = state.board_events.findIndex((event) => event?.kind === "wild");
  assert.notEqual(index, -1);
  const start = activateSafariDayBoardCell(runtime, index);
  assert.equal(start.boundary, "wild");
  assert.equal(state.battle?.kind, "wild");
  const selectedMoveId = preparePlayerForKo(runtime);
  primeFoeAtOneHp(state.battle);

  const result = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));
  assert.equal(result.decision, 1);
  assert.equal(state.battle.completed, true);
  assert.equal(state.battle.foe.hp, 0);
  assertImmediateKoPresentation(result, ["faint", "battle_result"]);
}

// Two-Pokemon trainer: first KO must return with the reserve active, then the
// second KO must terminalize. This catches regressions hidden by helper-only tests.
{
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  const index = state.board_events.findIndex((event) => event?.kind === "trainer");
  assert.notEqual(index, -1);
  activateSafariDayBoardCell(runtime, index);
  assert.equal(state.battle?.kind, "trainer");

  const selectedMoveId = preparePlayerForKo(runtime);
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

  const firstKo = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));
  assert.equal(firstKo.decision, 0);
  assert.equal(state.battle.completed, false);
  assert.equal(state.battle.trainer_party_index, 1);
  assert.ok(Number(state.battle.foe.hp) > 0, "replacement foe must remain able");
  assert.equal(firstKo.foeReplacementApplied === true || firstKo.replacementApplied === true, true);
  assertImmediateKoPresentation(firstKo, ["faint", "trainer_next"]);

  preparePlayerForKo(runtime);
  primeFoeAtOneHp(state.battle);
  const finalKo = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));
  assert.equal(finalKo.decision, 1);
  assert.equal(state.battle.completed, true);
  assert.equal(state.battle.trainer_party_index, 1);
  assertImmediateKoPresentation(finalKo, ["faint", "battle_result"]);
}

console.log("Safari public KO export-chain smoke: ok");

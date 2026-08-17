import assert from "node:assert/strict";
import fs from "node:fs";
import {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} from "../runtime/safari-playable-integration.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function startSingleFoeTrainer(runtime) {
  const state = runtime.variables.mapless;
  const index = state.board_events.findIndex((event) => event?.kind === "trainer");
  assert.notEqual(index, -1);
  activateSafariDayBoardCell(runtime, index);
  assert.equal(state.battle?.kind, "trainer");
  const foe = structuredClone(state.battle.foe);
  foe.fainted = false;
  state.battle.trainer_party = [structuredClone(foe)];
  state.battle.trainer_party_index = 0;
  state.battle.trainer_party_order = [0];
  state.battle.foe = structuredClone(foe);
  return { state, index };
}

// Architecture guard: every ordinary trainer round now enters the party-aware
// Battle transition. Final/no-reserve rounds may not fall through to the lower
// legacy round executor, and the upper Safari layer may not signal trainer AI by
// mutating move order.
{
  const legacy = fs.readFileSync(new URL("../runtime/safari-playable-integration-legacy.js", import.meta.url), "utf8");
  const preWounded = fs.readFileSync(new URL("../runtime/safari-playable-integration-pre-wounded.js", import.meta.url), "utf8");
  assert.doesNotMatch(legacy, /function trainerHasReserve/);
  assert.match(legacy, /if \(battle\.kind === "trainer"\) \{\s*return resolvePartyAwareTrainerRound/);
  assert.match(legacy, /finalizeResolvedTrainerBattle\(runtime\)/);
  assert.doesNotMatch(preWounded, /trainerUsesPartyAwareOwnedOpponent/);
  assert.match(preWounded, /if \(battle\.kind === "trainer"\) return null/);
}

// Final trainer KO: one Battle-owned round chooses the foe move, performs the
// KO, awards exactly that defeated foe's EXP, then finalizes Board/reward once.
{
  const runtime = createSafariPlayableRuntime();
  const { state } = startSingleFoeTrainer(runtime);
  const player = runtime.player.party[0];
  const selectedMoveId = moveId(player.moves[0]);
  player.hp = Math.max(1, Number(player.max_hp ?? player.hp ?? 1));
  player.stats.ATTACK = 9999;
  player.stats.SPEED = 9999;
  state.battle.foe.hp = 1;
  state.battle.trainer_party[0] = structuredClone(state.battle.foe);
  const expBefore = Number(player.exp ?? 0);

  const result = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));
  assert.equal(result.decision, 1);
  assert.equal(state.battle.completed, true);
  assert.ok(result.opponentChoice?.moveId, "terminal trainer round must use Battle-owned opponent choice");
  assert.equal(result.expIntegration?.commits?.length, 1, "final KO must create one Battle-owned EXP commit");
  const gained = Number(result.expIntegration.commits[0].expGained ?? 0);
  assert.ok(gained > 0);
  assert.equal(Number(state.battle.exp_gained ?? 0), gained, "terminal aggregate must consume the resolved EXP commit exactly once");
  assert.equal(Number(runtime.player.party[0].exp ?? 0), expBefore + gained, "final KO EXP must not be re-awarded by legacy finalization");
  assert.equal((result.presentation ?? []).filter((event) => event.type === "battle_result").length, 1);
  assert.equal((result.operations ?? []).filter((operation) => operation.op === "trainer_prize_money").length, 1);
}

// Terminal player loss with no reserve: it is also the same resolved trainer
// round. There is no second lower-core execution, no victory EXP and one result.
{
  const runtime = createSafariPlayableRuntime();
  const { state } = startSingleFoeTrainer(runtime);
  const player = runtime.player.party[0];
  const selectedMoveId = moveId(player.moves[0]);
  player.hp = 1;
  player.stats.SPEED = 0;
  player.stats.DEFENSE = 1;
  player.stats.SPECIAL_DEFENSE = 1;
  state.battle.foe.stats.ATTACK = 9999;
  state.battle.foe.stats.SPECIAL_ATTACK = 9999;
  state.battle.foe.stats.SPEED = 9999;
  state.battle.trainer_party[0] = structuredClone(state.battle.foe);
  const expBefore = Number(player.exp ?? 0);

  const result = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));
  assert.equal(result.decision, 2);
  assert.equal(state.battle.completed, true);
  assert.ok(result.opponentChoice?.moveId, "terminal loss must still use Battle-owned opponent choice");
  assert.equal(result.expIntegration?.commits?.length ?? 0, 0);
  assert.equal(Number(runtime.player.party[0].exp ?? 0), expBefore);
  assert.equal((result.presentation ?? []).filter((event) => event.type === "battle_result").length, 1);
  assert.equal((result.operations ?? []).some((operation) => operation.op === "trainer_prize_money"), false);
}

console.log("Safari trainer terminal single-transition smoke: ok");

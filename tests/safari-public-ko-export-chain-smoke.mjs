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

function assertKoPresentation(result, expectedSemanticTypes) {
  const types = (result.presentation ?? []).map((event) => event.type);
  for (const type of expectedSemanticTypes) assert.equal(types.includes(type), true, `missing ${type} semantic event`);
}

// Guard the architecture itself: intermediate trainer KO must never return to
// the old finalize -> snapshot rollback -> synthetic next-slot compensation,
// browser combat must consume Battle Runtime HP directly, intermediate EXP and
// opponent choice must be owned inside the same party-aware Battle transition,
// and the public entry must not rewrite the completed owner presentation.
{
  const legacySource = fs.readFileSync(new URL("../runtime/safari-playable-integration-legacy.js", import.meta.url), "utf8");
  const preWoundedSource = fs.readFileSync(new URL("../runtime/safari-playable-integration-pre-wounded.js", import.meta.url), "utf8");
  const trainerRoundSource = fs.readFileSync(new URL("../runtime/browser-trainer-battle-round-runtime.js", import.meta.url), "utf8");
  const publicSource = fs.readFileSync(new URL("../runtime/safari-playable-integration.js", import.meta.url), "utf8");
  const roundSource = fs.readFileSync(new URL("../runtime/browser-battle-round-runtime.js", import.meta.url), "utf8");
  assert.doesNotMatch(legacySource, /snapshotRoundSideEffects|restoreIntermediateSideEffects/);
  assert.doesNotMatch(legacySource, /op:\s*["']trainer_send_next["']/);
  assert.doesNotMatch(legacySource, /awardSafariTrainerIntermediateExp|safari-trainer-intermediate-exp/);
  assert.doesNotMatch(legacySource, /foeMoveId\s*=\s*moveId\(battle\.foe/);
  assert.match(legacySource, /playerBattleExpInput:\s*trainerBattleExpInput/);
  assert.match(legacySource, /ownedOpponentInput/);
  assert.match(legacySource, /resolved\.expIntegration\?\.commits/);
  assert.match(legacySource, /resolveBrowserTrainerBattleRound/);
  assert.match(trainerRoundSource, /resolveBrowserBattleRoundWithOwnedOpponent/);
  assert.match(trainerRoundSource, /ownedOpponentInput/);
  assert.match(preWoundedSource, /trainerUsesPartyAwareOwnedOpponent/);
  assert.match(preWoundedSource, /if \(trainerUsesPartyAwareOwnedOpponent\(battle\)\) return null/);
  assert.doesNotMatch(publicSource, /continueSafariTrainerAfterFirstKo/);
  assert.doesNotMatch(publicSource, /finalizeSafariRoundPresentation|safariKoPresentationImmediate|isKoRound/);
  assert.match(roundSource, /attachDefeatedFoeExpInput/);
  assert.match(roundSource, /playerExpCommits/);
  assert.doesNotMatch(roundSource, /projectBrowserBattleResolvedHp|browser-battle-round-hp-projection/);
  assert.equal(fs.existsSync(new URL("../runtime/browser-battle-round-hp-projection.js", import.meta.url)), false);
  assert.equal(fs.existsSync(new URL("../runtime/safari-trainer-intermediate-exp.js", import.meta.url)), false);
}

// Wild terminal KO through the direct playable integration selected by the public shell.
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
  assert.equal(Number(result.foe?.hp), 0, "public result must expose Battle Runtime-owned terminal foe HP");
  assertKoPresentation(result, ["move_started", "damage_applied", "faint", "battle_result"]);
}

// Two-Pokemon trainer: the first KO is born nonterminal in the party-aware
// round. The same Battle transition must choose the opponent move, award EXP,
// and apply canonical replacement without touching reward/Board finalization.
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
  const foeMoveOrderBefore = state.battle.foe.moves.map(moveId);

  const moneyBefore = Number(runtime.bag.money);
  const bagBefore = structuredClone(runtime.bag.slots);
  const boardEventsBefore = structuredClone(state.board_events);
  const boardConsumedBefore = structuredClone(state.board_consumed);
  const boardRevealedBefore = structuredClone(state.board_revealed);
  const expBefore = Number(runtime.player.party[0].exp ?? 0);

  const firstKo = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));
  assert.equal(firstKo.decision, 0);
  assert.equal(state.battle.completed, false);
  assert.ok(firstKo.opponentChoice?.moveId, "party-aware trainer round must expose its Battle-owned opponent choice");
  assert.equal(firstKo.opponentChoice.command, "move");
  assert.deepEqual(state.battle.trainer_party[0].moves.map(moveId), foeMoveOrderBefore, "Battle AI must not signal its choice by mutating the defeated source move order");
  assert.equal(state.battle.trainer_party_index, 1);
  assert.equal(Number(state.battle.trainer_party[0].hp), 0);
  assert.ok(Number(state.battle.foe.hp) > 0, "replacement foe must remain able");
  assert.equal(Number(firstKo.foe?.hp), Number(state.battle.foe.hp), "replacement HP must come from the owner state, not stale KO operations");
  assert.equal(Number(firstKo.player?.hp), Number(runtime.player.party[state.battle.player_party_index ?? 0]?.hp), "player HP must stay identical across Battle Runtime and Safari state");
  assert.equal(firstKo.foeReplacementApplied === true || firstKo.replacementApplied === true, true);
  assert.equal(firstKo.expIntegration?.commits?.length, 1, "intermediate KO must create exactly one Battle-owned EXP commit");
  assert.ok(Number(firstKo.expIntegration.commits[0].expGained ?? 0) > 0, "Battle-owned intermediate EXP commit must gain EXP");
  assert.equal(Number(state.battle.trainer_exp_gained ?? 0), Number(firstKo.expIntegration.commits[0].expGained ?? 0), "Safari cumulative trainer EXP must consume the Battle-owned commit, not recalculate it");
  assert.ok(Number(runtime.player.party[0].exp ?? 0) > expBefore, "intermediate defeated trainer Pokemon must award EXP immediately");
  assert.ok((firstKo.operations ?? []).some((operation) => operation?.scope === "exp"), "Battle EXP flow operations must travel through the real round result");
  assert.equal(Number(runtime.bag.money), moneyBefore, "intermediate KO must not pay trainer prize");
  assert.deepEqual(runtime.bag.slots, bagBefore, "intermediate KO must not grant/rollback item rewards");
  assert.deepEqual(state.board_events, boardEventsBefore, "intermediate KO must not finalize/rollback Board events");
  assert.deepEqual(state.board_consumed, boardConsumedBefore, "intermediate KO must not finalize/rollback Board consumption");
  assert.deepEqual(state.board_revealed, boardRevealedBefore, "intermediate KO must not finalize/rollback Board reveal state");
  assert.equal((firstKo.operations ?? []).some((operation) => operation?.op === "trainer_send_next"), false, "replacement must come from trainer replacement owner, not a synthetic Safari op");
  assert.equal((firstKo.presentation ?? []).filter((event) => event.type === "trainer_next").length, 1);
  assertKoPresentation(firstKo, ["move_started", "damage_applied", "faint", "trainer_next"]);

  preparePlayerForKo(runtime);
  primeFoeAtOneHp(state.battle);
  const finalKo = await Promise.resolve(resolveSafariBattleRound(runtime, selectedMoveId));
  assert.equal(finalKo.decision, 1);
  assert.equal(state.battle.completed, true);
  assert.equal(state.battle.trainer_party_index, 1);
  assert.equal(Number(finalKo.player?.hp), Number(runtime.player.party[state.battle.player_party_index ?? 0]?.hp), "terminal player HP must be the same owner state persisted to Safari");
  assert.ok(Number(runtime.bag.money) >= moneyBefore, "final victory may pay the trainer prize exactly at terminal completion");
  assertKoPresentation(finalKo, ["move_started", "damage_applied", "faint", "battle_result"]);
}

console.log("Safari public KO export-chain smoke: ok");

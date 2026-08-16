import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBrowserTrainerReplacementContinuation } from "./browser-trainer-replacement-continuation.js";

function clone(value) { return value == null ? value : structuredClone(value); }

export function resolveBrowserTrainerBattleRound({ roundInput = {}, replacementDecisionInput = {}, partyOrder = null, idxBattler = 1, sideSize = 1 } = {}) {
  const round = resolveBrowserBattleRound(roundInput);
  const continuation = resolveBrowserTrainerReplacementContinuation({
    battleContinuationHandoff: round.battleContinuationHandoff,
    replacementDecisionInput,
    partyOrder,
    idxBattler,
    sideSize,
  });
  const replacementApplied = continuation.result === "continued_with_replacement";
  const nextHandoff = replacementApplied ? continuation.battleContinuationHandoff : round.battleContinuationHandoff;
  const nextFoe = replacementApplied ? continuation.activeFoe : round.foe;
  const switchOperations = clone(continuation.operations ?? []);
  return {
    ...round,
    trainerReplacementContinuation: continuation,
    replacementApplied,
    nextRoundState: {
      player: clone(round.player),
      foe: clone(nextFoe),
      playerParty: clone(nextHandoff?.playerParty ?? null),
      foeParty: clone(nextHandoff?.foeParty ?? null),
      playerActivePartyIndex: Number(nextHandoff?.playerActivePartyIndex ?? roundInput.playerActivePartyIndex ?? 0),
      foeActivePartyIndex: Number(nextHandoff?.foeActivePartyIndex ?? roundInput.foeActivePartyIndex ?? 0),
      partyOrder: replacementApplied ? clone(continuation.partyOrder) : clone(partyOrder),
      decision: Number(nextHandoff?.decision ?? round.decision ?? 0),
      playerReplacementRequired: Boolean(nextHandoff?.playerReplacementRequired),
      foeReplacementRequired: Boolean(nextHandoff?.foeReplacementRequired),
    },
    continuationOperations: switchOperations,
    presentationOperations: [...round.operations, ...switchOperations],
  };
}

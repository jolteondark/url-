import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBrowserTrainerReplacementContinuation } from "./browser-trainer-replacement-continuation.js";
import { resolveBrowserPlayerReplacementContinuation } from "./browser-player-replacement-continuation.js";

function clone(value) { return value == null ? value : structuredClone(value); }

export function resolveBrowserTrainerBattleRound({
  roundInput = {},
  replacementDecisionInput = {},
  partyOrder = null,
  idxBattler = 1,
  sideSize = 1,
  playerReplacementPartyIndex = null,
  playerPartyOrder = null,
  playerIdxBattler = 0,
} = {}) {
  const preparedRoundInput = {
    ...roundInput,
    reflectedPartyIndex: roundInput.reflectedPartyIndex
      ?? roundInput.playerActivePartyIndex
      ?? 0,
  };
  const round = resolveBrowserBattleRound(preparedRoundInput);
  const foeContinuation = resolveBrowserTrainerReplacementContinuation({
    battleContinuationHandoff: round.battleContinuationHandoff,
    replacementDecisionInput,
    partyOrder,
    idxBattler,
    sideSize,
  });
  const foeReplacementApplied = foeContinuation.result === "continued_with_replacement";
  const afterFoeHandoff = foeReplacementApplied ? foeContinuation.battleContinuationHandoff : round.battleContinuationHandoff;
  const nextFoe = foeReplacementApplied ? foeContinuation.activeFoe : round.foe;
  const foeSwitchOperations = clone(foeContinuation.operations ?? []);

  const playerContinuation = resolveBrowserPlayerReplacementContinuation({
    battleContinuationHandoff: afterFoeHandoff,
    replacementPartyIndex: playerReplacementPartyIndex,
    partyOrder: playerPartyOrder,
    idxBattler: playerIdxBattler,
    sideSize,
  });
  const playerReplacementApplied = playerContinuation.result === "continued_with_replacement";
  const nextHandoff = playerReplacementApplied ? playerContinuation.battleContinuationHandoff : afterFoeHandoff;
  const nextPlayer = playerReplacementApplied ? playerContinuation.activePlayer : round.player;
  const playerSwitchOperations = clone(playerContinuation.operations ?? []);
  const continuationOperations = [...foeSwitchOperations, ...playerSwitchOperations];

  return {
    ...round,
    player: clone(nextPlayer),
    foe: clone(nextFoe),
    trainerReplacementContinuation: foeContinuation,
    playerReplacementContinuation: playerContinuation,
    replacementApplied: foeReplacementApplied,
    foeReplacementApplied,
    playerReplacementApplied,
    nextRoundState: {
      player: clone(nextPlayer),
      foe: clone(nextFoe),
      playerParty: clone(nextHandoff?.playerParty ?? null),
      foeParty: clone(nextHandoff?.foeParty ?? null),
      playerActivePartyIndex: Number(nextHandoff?.playerActivePartyIndex ?? roundInput.playerActivePartyIndex ?? 0),
      foeActivePartyIndex: Number(nextHandoff?.foeActivePartyIndex ?? roundInput.foeActivePartyIndex ?? 0),
      partyOrder: foeReplacementApplied ? clone(foeContinuation.partyOrder) : clone(partyOrder),
      playerPartyOrder: playerReplacementApplied ? clone(playerContinuation.partyOrder) : clone(playerPartyOrder),
      decision: Number(nextHandoff?.decision ?? round.decision ?? 0),
      playerReplacementRequired: Boolean(nextHandoff?.playerReplacementRequired),
      foeReplacementRequired: Boolean(nextHandoff?.foeReplacementRequired),
    },
    continuationOperations,
    presentationOperations: [...round.operations, ...continuationOperations],
  };
}

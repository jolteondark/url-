import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBrowserBattleRoundWithOwnedOpponent } from "./browser-battle-round-owned-opponent-runtime.js";
import { resolveBrowserTrainerReplacementContinuation } from "./browser-trainer-replacement-continuation.js";
import { resolveBrowserPlayerReplacementContinuation } from "./browser-player-replacement-continuation.js";

function clone(value) { return value == null ? value : structuredClone(value); }

function trainerReplacementCommitInput({
  round,
  replacementDecisionInput,
  partyOrder,
  idxBattler,
  sideSize,
}) {
  if (!round?.battleContinuationHandoff?.foeReplacementRequired) return null;
  return {
    battleContinuationHandoff: clone(round.battleContinuationHandoff),
    replacementDecisionInput: clone(replacementDecisionInput ?? {}),
    partyOrder: clone(partyOrder),
    idxBattler,
    sideSize,
  };
}

export function commitBrowserTrainerFoeReplacement(result) {
  const input = result?.trainerReplacementCommitInput;
  if (!input) return result;
  if (result.foeReplacementApplied) return result;

  const foeContinuation = resolveBrowserTrainerReplacementContinuation(input);
  if (foeContinuation.result !== "continued_with_replacement") {
    throw new Error(`trainer replacement owner did not continue: ${foeContinuation.result}`);
  }

  const handoff = foeContinuation.battleContinuationHandoff;
  const foeSwitchOperations = clone(foeContinuation.operations ?? []);
  const previousContinuationOperations = clone(result.continuationOperations ?? []);
  const continuationOperations = [...foeSwitchOperations, ...previousContinuationOperations];
  const nextRoundState = {
    ...(clone(result.nextRoundState) ?? {}),
    foe: clone(foeContinuation.activeFoe),
    foeParty: clone(handoff?.foeParty ?? result.nextRoundState?.foeParty ?? null),
    foeActivePartyIndex: Number(handoff?.foeActivePartyIndex ?? result.nextRoundState?.foeActivePartyIndex ?? 0),
    partyOrder: clone(foeContinuation.partyOrder ?? result.nextRoundState?.partyOrder ?? null),
    decision: Number(handoff?.decision ?? result.nextRoundState?.decision ?? result.decision ?? 0),
    foeReplacementRequired: Boolean(handoff?.foeReplacementRequired),
  };

  result.foe = clone(foeContinuation.activeFoe);
  result.trainerReplacementContinuation = foeContinuation;
  result.replacementApplied = true;
  result.foeReplacementApplied = true;
  result.foeReplacementRequired = false;
  result.nextRoundState = nextRoundState;
  result.foeReplacementOperations = foeSwitchOperations;
  result.continuationOperations = continuationOperations;
  result.presentationOperations = [...(result.operations ?? []), ...continuationOperations];
  return result;
}

export function resolveBrowserTrainerBattleRound({
  roundInput = {},
  ownedOpponentInput = null,
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
  const round = ownedOpponentInput
    ? resolveBrowserBattleRoundWithOwnedOpponent({ ...preparedRoundInput, ...ownedOpponentInput })
    : resolveBrowserBattleRound(preparedRoundInput);
  const replacementCommitInput = trainerReplacementCommitInput({
    round,
    replacementDecisionInput,
    partyOrder,
    idxBattler,
    sideSize,
  });

  // Foe replacement mechanics are deliberately not committed here. The central
  // Battle orchestrator invokes the existing canonical chooser/switch owner only
  // after POST_FAINT has advanced to the REPLACEMENT checkpoint.
  const afterFoeHandoff = round.battleContinuationHandoff;
  const nextFoe = round.foe;

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

  return {
    ...round,
    player: clone(nextPlayer),
    foe: clone(nextFoe),
    trainerReplacementContinuation: null,
    trainerReplacementCommitInput: replacementCommitInput,
    playerReplacementContinuation: playerContinuation,
    replacementApplied: false,
    foeReplacementApplied: false,
    foeReplacementRequired: Boolean(replacementCommitInput),
    playerReplacementApplied,
    nextRoundState: {
      player: clone(nextPlayer),
      foe: clone(nextFoe),
      playerParty: clone(nextHandoff?.playerParty ?? null),
      foeParty: clone(nextHandoff?.foeParty ?? null),
      playerActivePartyIndex: Number(nextHandoff?.playerActivePartyIndex ?? roundInput.playerActivePartyIndex ?? 0),
      foeActivePartyIndex: Number(nextHandoff?.foeActivePartyIndex ?? roundInput.foeActivePartyIndex ?? 0),
      partyOrder: clone(partyOrder),
      playerPartyOrder: playerReplacementApplied ? clone(playerContinuation.partyOrder) : clone(playerPartyOrder),
      decision: Number(nextHandoff?.decision ?? round.decision ?? 0),
      playerReplacementRequired: Boolean(nextHandoff?.playerReplacementRequired),
      foeReplacementRequired: Boolean(nextHandoff?.foeReplacementRequired),
    },
    continuationOperations: playerSwitchOperations,
    presentationOperations: [...round.operations, ...playerSwitchOperations],
  };
}

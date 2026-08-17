import { resolveBrowserBattleRound } from './browser-battle-round-runtime.js';
import { resolveBrowserOpponentMoveChoiceCanonical } from './battle-core-browser-opponent-move-choice.js';

export function resolveBrowserBattleRoundWithOwnedOpponent(input = {}) {
  const opponentChoice = resolveBrowserOpponentMoveChoiceCanonical({
    battleKind: input.battleKind,
    player: input.player,
    foe: input.foe,
    moveMasters: input.moveMasters,
    aiRandomSeed: input.foeAiRandomSeed,
    aiRandomRolls: input.foeAiRandomRolls,
    trainerSkill: input.trainerSkill,
    trainerFlags: input.trainerFlags,
    ownReserveCount: input.foeReserveCount,
    foeReserveCount: input.playerReserveCount,
    mechanicsGeneration: input.mechanicsGeneration,
    turnCount: input.turnCount,
    canSwitchLax: input.canSwitchLax,
    badMoveSwitchRegistered: input.badMoveSwitchRegistered,
    badMoveSwitchPartyIndex: input.badMoveSwitchPartyIndex,
  });
  const round = resolveBrowserBattleRound({
    player: input.player,
    foe: input.foe,
    playerParty: input.playerParty,
    foeParty: input.foeParty,
    playerActivePartyIndex: input.playerActivePartyIndex,
    foeActivePartyIndex: input.foeActivePartyIndex,
    selectedMoveId: input.selectedMoveId,
    foeMoveId: opponentChoice.moveId,
    moveMasters: input.moveMasters,
    combatRandomSeed: input.combatRandomSeed,
    priorityRandomSeed: input.priorityRandomSeed,
    playerRandomRoll: input.playerRandomRoll,
    foeRandomRoll: input.foeRandomRoll,
    playerBattleExpInput: input.playerBattleExpInput,
    postBattlePersistenceInput: input.postBattlePersistenceInput,
    reflectedPartyIndex: input.reflectedPartyIndex,
  });
  return { ...round, opponentChoice };
}

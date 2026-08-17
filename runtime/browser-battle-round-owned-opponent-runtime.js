import { resolveBrowserBattleRound } from './browser-battle-round-runtime.js';
import { resolveBrowserOpponentMoveChoiceCanonical } from './battle-core-browser-opponent-move-choice.js';
import { projectOwnedOpponentRoundInputCanonical } from './browser-battle-owned-opponent-state-handoff.js';

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
  const round = resolveBrowserBattleRound(projectOwnedOpponentRoundInputCanonical(input, opponentChoice));
  return { ...round, opponentChoice };
}

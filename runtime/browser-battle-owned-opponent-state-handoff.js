export function projectOwnedOpponentRoundInputCanonical(input = {}, opponentChoice = {}) {
  return {
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
    postBattlePersistenceInput: input.postBattlePersistenceInput,
    reflectedPartyIndex: input.reflectedPartyIndex,
  };
}

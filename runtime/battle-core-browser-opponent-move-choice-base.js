import {
  buildWildMoveChoicesCanonical,
  resolveEnemyMoveChoiceCanonical,
} from './battle-core-enemy-command-choice.js';
import { resolveTrainerMoveChoiceWithPriorityFlinchCanonical } from './battle-core-trainer-choice-priority-flinch-integration.js';

function moveId(move) {
  return typeof move === 'string' ? move : move?.id;
}

function legalMoveEntries(foe, moveMasters) {
  return (Array.isArray(foe?.moves) ? foe.moves : []).flatMap((runtimeMove, moveIndex) => {
    const id = moveId(runtimeMove);
    const master = moveMasters?.[id];
    const pp = Number(runtimeMove?.pp ?? 0);
    if (!id || !master || pp <= 0) return [];
    return [{ moveIndex, moveId: id, moveMaster: master }];
  });
}

function requireMoveResolution(resolution, legal) {
  if (resolution?.command !== 'move' || !Number.isInteger(resolution.moveIndex)) {
    throw new RangeError(`browser battle round requires a move command; got ${resolution?.command ?? 'none'}`);
  }
  const selected = legal.find((entry) => entry.moveIndex === resolution.moveIndex);
  if (!selected) throw new RangeError('canonical opponent choice selected a non-legal move index');
  return { ...resolution, moveId: selected.moveId };
}

function struggleResolution(foe) {
  const moves = Array.isArray(foe?.moves) ? foe.moves : [];
  if (!moves.length) throw new RangeError('opponent has no moves');
  return {
    command: 'struggle',
    reason: 'all_moves_out_of_pp',
    moveIndex: 0,
    moveId: 'STRUGGLE',
    choices: [],
    weightedChoices: [],
    randomRolls: [],
  };
}

export function resolveBrowserOpponentMoveChoiceCanonical({
  battleKind = 'wild',
  player,
  foe,
  moveMasters,
  aiRandomSeed,
  aiRandomRolls,
  trainerSkill = 0,
  trainerFlags = [],
  ownReserveCount = 0,
  foeReserveCount = 0,
  mechanicsGeneration = 9,
  turnCount = 0,
  canSwitchLax = false,
  badMoveSwitchRegistered = false,
  badMoveSwitchPartyIndex = -1,
} = {}) {
  const legal = legalMoveEntries(foe, moveMasters);
  if (!legal.length) return struggleResolution(foe);

  if (String(battleKind).toLowerCase() !== 'trainer') {
    const resolution = resolveEnemyMoveChoiceCanonical({
      choices: buildWildMoveChoicesCanonical(legal.map((entry) => ({ moveIndex: entry.moveIndex, targetIndex: 0 }))),
      skill: 0,
      aiRandomSeed,
      aiRandomRolls,
    });
    return requireMoveResolution(resolution, legal);
  }

  const candidates = legal.map((entry) => ({
    moveIndex: entry.moveIndex,
    targetIndex: 0,
    userIndex: 1,
    userPokemon: foe,
    targetPokemon: player,
    moveMaster: entry.moveMaster,
    skill: Number(trainerSkill ?? 0),
    trainerFlags,
    ownReserveCount,
    foeReserveCount,
    mechanicsGeneration,
  }));
  const resolution = resolveTrainerMoveChoiceWithPriorityFlinchCanonical({
    candidates,
    skill: Number(trainerSkill ?? 0),
    trainerFlags,
    ownReserveCount,
    foeReserveCount,
    mechanicsGeneration,
    turnCount,
    canSwitchLax,
    badMoveSwitchRegistered,
    badMoveSwitchPartyIndex,
    aiRandomSeed,
    aiRandomRolls,
    userMoveMasters: legal.map((entry) => entry.moveMaster),
  });
  return requireMoveResolution(resolution, legal);
}

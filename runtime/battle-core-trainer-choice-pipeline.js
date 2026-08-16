import { buildTrainerRoughEstimates } from './battle-core-trainer-rough-estimates.js';
import { buildTrainerMoveChoicesFromGenericScoresCanonical } from './battle-core-trainer-generic-move-scoring.js';
import { resolveEnemyMoveChoiceCanonical } from './battle-core-enemy-command-choice.js';

function finiteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);
  return value;
}
function integer(value, label) {
  if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer`);
  return value;
}
function stat(stats, key, label) {
  if (!stats || typeof stats !== 'object') throw new TypeError(`${label}.stats is required`);
  return finiteNumber(stats[key], `${label}.stats.${key}`);
}
function normalizeCategory(value) {
  const category = String(value ?? '').toUpperCase();
  if (category === 'PHYSICAL' || category === 'SPECIAL' || category === 'STATUS') return category;
  throw new TypeError('moveMaster.category must be PHYSICAL, SPECIAL, or STATUS');
}

export function buildTrainerScoringCandidateFromBattleState(candidate = {}) {
  const moveIndex = integer(candidate.moveIndex, 'moveIndex');
  const targetIndex = integer(candidate.targetIndex, 'targetIndex');
  const user = candidate.userPokemon;
  const target = candidate.targetPokemon;
  const move = candidate.moveMaster;
  const resolved = candidate.resolvedFacts || {};
  if (!user || typeof user !== 'object') throw new TypeError('userPokemon is required');
  if (!target || typeof target !== 'object') throw new TypeError('targetPokemon is required');
  if (!move || typeof move !== 'object') throw new TypeError('moveMaster is required');
  const category = normalizeCategory(resolved.category ?? move.category);
  const damagingMove = category !== 'STATUS';
  const userLevel = finiteNumber(user.level, 'userPokemon.level');
  const targetLevel = finiteNumber(target.level, 'targetPokemon.level');
  const targetHp = finiteNumber(target.hp, 'targetPokemon.hp');
  const targetTotalHp = finiteNumber(target.max_hp ?? target.maxHp ?? target.total_hp ?? target.totalHp, 'targetPokemon.max_hp');
  const defaultAttack = category === 'SPECIAL' ? stat(user.stats, 'SPECIAL_ATTACK', 'userPokemon') : stat(user.stats, 'ATTACK', 'userPokemon');
  const defaultDefense = category === 'SPECIAL' ? stat(target.stats, 'SPECIAL_DEFENSE', 'targetPokemon') : stat(target.stats, 'DEFENSE', 'targetPokemon');
  const accuracyInput = {
    baseAccuracy: finiteNumber(resolved.baseAccuracy ?? move.accuracy, 'move accuracy'),
    userLevel, targetLevel,
    accuracyStage: finiteNumber(resolved.accuracyStage ?? 0, 'accuracyStage'),
    evasionStage: finiteNumber(resolved.evasionStage ?? 0, 'evasionStage'),
    accuracyMultiplier: finiteNumber(resolved.accuracyMultiplier ?? 1, 'accuracyMultiplier'),
    evasionMultiplier: finiteNumber(resolved.evasionMultiplier ?? 1, 'evasionMultiplier'),
    resolvedBaseAccuracy: resolved.resolvedBaseAccuracy,
    ohko: resolved.ohko === true,
    ohkoIce: resolved.ohkoIce === true,
    userHasIceType: resolved.userHasIceType === true,
    mediumSkill: resolved.mediumSkill === true,
    telekinesis: resolved.telekinesis === true,
    minimized: resolved.minimized === true,
    tramplesMinimize: resolved.tramplesMinimize === true,
    mechanicsGeneration: finiteNumber(resolved.mechanicsGeneration ?? 9, 'mechanicsGeneration'),
  };
  const damageInput = {
    basePower: finiteNumber(resolved.basePower ?? move.power ?? move.basePower ?? 0, 'move power'),
    powerMultiplier: finiteNumber(resolved.powerMultiplier ?? 1, 'powerMultiplier'),
    attack: finiteNumber(resolved.attack ?? defaultAttack, 'attack'),
    attackMultiplier: finiteNumber(resolved.attackMultiplier ?? 1, 'attackMultiplier'),
    defense: finiteNumber(resolved.defense ?? defaultDefense, 'defense'),
    defenseMultiplier: finiteNumber(resolved.defenseMultiplier ?? 1, 'defenseMultiplier'),
    userLevel,
    finalDamageMultiplier: finiteNumber(resolved.finalDamageMultiplier ?? 1, 'finalDamageMultiplier'),
    targetHp,
    fixedDamage: resolved.fixedDamage === true,
    fixedDamageValue: resolved.fixedDamageValue,
    nonLethal: resolved.nonLethal === true,
  };
  const estimates = buildTrainerRoughEstimates({ accuracy: accuracyInput, damage: damageInput });
  return {
    ...candidate.genericScoreFacts,
    moveIndex, targetIndex,
    score: Number(candidate.baseScore ?? candidate.genericScoreFacts?.score ?? 100),
    skill: Number(candidate.skill ?? 0),
    wildPokemon: false,
    damagingMove,
    roughAccuracy: estimates.roughAccuracy,
    roughDamage: estimates.roughDamage,
    targetHp, targetTotalHp,
    substituteHp: Number(resolved.substituteHp ?? 0),
    hpAware: resolved.hpAware === true,
    multiHitMove: resolved.multiHitMove === true,
    targetHasSturdy: resolved.targetHasSturdy === true,
    targetHasFocusSash: resolved.targetHasFocusSash === true,
    roughEstimateInput: { accuracy: accuracyInput, damage: damageInput },
  };
}

export function buildTrainerMoveChoicesFromBattleStateCanonical(candidates = []) {
  const prepared = (Array.isArray(candidates) ? candidates : []).map(buildTrainerScoringCandidateFromBattleState);
  const scored = buildTrainerMoveChoicesFromGenericScoresCanonical(prepared);
  return scored.map((choice, index) => ({ ...choice, roughEstimateInput: prepared[index].roughEstimateInput }));
}

export function resolveTrainerMoveChoiceFromBattleStateCanonical(input = {}) {
  const choices = buildTrainerMoveChoicesFromBattleStateCanonical(input.candidates || []);
  const resolution = resolveEnemyMoveChoiceCanonical({
    choices,
    skill: Number(input.skill ?? 0),
    canSwitchLax: input.canSwitchLax === true,
    turnCount: Number(input.turnCount ?? 0),
    badMoveSwitchRegistered: input.badMoveSwitchRegistered === true,
    badMoveSwitchPartyIndex: input.badMoveSwitchPartyIndex,
    aiRandomSeed: input.aiRandomSeed,
    aiRandomRolls: input.aiRandomRolls,
  });
  return { ...resolution, choices };
}

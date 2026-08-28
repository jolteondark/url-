import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { createBattleStatStageStateCanonical } from "./battle-core-stat-stages.js";

export const BATTLE_CONFUSION_TURNS_FIELD = "__battle_confusion_turns";

export function browserBattleConfusionTurns(pokemon) {
  const turns = Number(pokemon?.[BATTLE_CONFUSION_TURNS_FIELD] ?? 0);
  return Number.isInteger(turns) && turns > 0 ? turns : 0;
}

export function stripBrowserBattleConfusion(pokemon) {
  const next = structuredClone(pokemon);
  if (next && typeof next === "object") delete next[BATTLE_CONFUSION_TURNS_FIELD];
  return next;
}

export function stripBrowserBattleConfusionParty(party) {
  return (Array.isArray(party) ? party : []).map((pokemon) => stripBrowserBattleConfusion(pokemon));
}

export function withBrowserBattleConfusion(pokemon, turns) {
  const next = stripBrowserBattleConfusion(pokemon);
  const count = Number(turns);
  if (Number(next?.hp ?? 0) > 0 && Number.isInteger(count) && count > 0) {
    next[BATTLE_CONFUSION_TURNS_FIELD] = count;
  }
  return next;
}

function confusionRollSeed(combatRandomSeed, battlerIndex) {
  const seed = Number(combatRandomSeed ?? 0) & 0x7fffffff;
  return (seed ^ 0x434f4e46 ^ Math.imul(Number(battlerIndex) + 1, 0x45d9f3b)) & 0x7fffffff;
}

export function buildBrowserBattleConfusionTryUseInput({ pokemon, battlerIndex, statStages = null, combatRandomSeed = 0, randomRoll = null } = {}) {
  const confusionTurns = browserBattleConfusionTurns(pokemon);
  if (confusionTurns <= 0) return null;
  const stages = createBattleStatStageStateCanonical(statStages);
  const ownStages = stages[Number(battlerIndex)] ?? stages[0];
  const roll = randomRoll === null || randomRoll === undefined
    ? new RubyMT19937Random(confusionRollSeed(combatRandomSeed, battlerIndex)).randInt(100)
    : Number(randomRoll);
  return {
    confusionTurns,
    mechanicsGeneration: 9,
    confusionRoll: roll,
    confusionDamageInput: {
      hpBefore: Number(pokemon.hp),
      totalHp: Number(pokemon.max_hp),
      damageInput: {
        level: Number(pokemon.level),
        attack: Number(pokemon.stats.ATTACK),
        defense: Number(pokemon.stats.DEFENSE),
        attackStageIndex: 6 + Number(ownStages.ATTACK ?? 0),
        defenseStageIndex: 6 + Number(ownStages.DEFENSE ?? 0),
      },
    },
  };
}

function battlerAction(preparedRound, battlerIndex) {
  return (Array.isArray(preparedRound?.actions) ? preparedRound.actions : []).find((action) =>
    Number(action?.battlerIndex) === Number(battlerIndex)
  ) ?? null;
}

function appliedConfusionAfterAction(preparedRound, battlerIndex) {
  const applications = [];
  for (const action of preparedRound?.actions ?? []) {
    const resolution = action?.transientConfusionEffectResolution;
    if (!resolution?.applied || Number(resolution.targetBattlerIndex) !== Number(battlerIndex)) continue;
    applications.push(resolution);
  }
  return applications;
}

export function browserBattleConfusionTurnsAfterRound({ preparedRound, battlerIndex, pokemonBefore, pokemonAfter } = {}) {
  if (Number(pokemonAfter?.hp ?? 0) <= 0) return 0;
  let turns = browserBattleConfusionTurns(pokemonBefore);
  const action = battlerAction(preparedRound, battlerIndex);
  const inputTurns = Number(action?.useMoveInput?.tryUseMoveInput?.confusionTurns ?? 0);
  if (action?.tryUseMoveResolution && inputTurns > 0) {
    turns = Math.max(0, Number(action.tryUseMoveResolution.confusionTurns ?? turns));
  }
  for (const application of appliedConfusionAfterAction(preparedRound, battlerIndex)) {
    if (application.targetHadActed === true || !action || !action.tryUseMoveResolution) {
      turns = Math.max(0, Number(application.turns ?? 0));
    }
  }
  return Number.isInteger(turns) && turns > 0 ? turns : 0;
}

export function projectBrowserBattleConfusionAfterRound({ preparedRound, playerBefore, foeBefore, playerAfter, foeAfter } = {}) {
  const playerTurns = browserBattleConfusionTurnsAfterRound({ preparedRound, battlerIndex: 0, pokemonBefore: playerBefore, pokemonAfter: playerAfter });
  const foeTurns = browserBattleConfusionTurnsAfterRound({ preparedRound, battlerIndex: 1, pokemonBefore: foeBefore, pokemonAfter: foeAfter });
  return {
    player: withBrowserBattleConfusion(playerAfter, playerTurns),
    foe: withBrowserBattleConfusion(foeAfter, foeTurns),
    turns: Object.freeze({ player: playerTurns, foe: foeTurns }),
  };
}

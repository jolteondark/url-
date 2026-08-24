import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { safariGeneralPokemonTypesV108 } from "./safari-general-species-type-facts.js";
import {
  majorStatusMoveEffectSourceCanonical,
  resolveMajorStatusMoveEffectCanonical,
  resolveSecondaryMajorStatusMoveEffectCanonical,
  secondaryMajorStatusMoveEffectSourceCanonical,
} from "./battle-core-major-status-move.js";

function pokemonTypes(pokemon) {
  if (Array.isArray(pokemon?.types) && pokemon.types.length > 0) return pokemon.types;
  return safariGeneralPokemonTypesV108(pokemon);
}

const FLINCH_SECONDARY_FUNCTION_CODES_V108 = new Set([
  "FlinchTarget",
  "BurnFlinchTarget",
  "FreezeFlinchTarget",
  "ParalyzeFlinchTarget",
  // Legacy aliases retained for older focused fixtures/serialized data.
  "BurnTargetFlinchTarget",
  "FreezeTargetFlinchTarget",
  "ParalyzeTargetFlinchTarget",
]);

const RANDOM_MAJOR_STATUS_SECONDARY_FUNCTION_CODES_V108 = Object.freeze({
  ParalyzeBurnOrFreezeTarget: Object.freeze(["PARALYSIS", "BURN", "FROZEN"]),
});

function directFlinchSecondaryEffectInput(move) {
  if (!move || move.category === "Status") return null;
  if (!FLINCH_SECONDARY_FUNCTION_CODES_V108.has(move.function_code)) return null;
  const effectChance = Number(move.effect_chance ?? 0);
  if (effectChance <= 0) return null;
  return {
    calcDamage: 1,
    effectChance,
    functionCode: "FlinchTarget",
    transientEffect: "flinch",
  };
}

function randomMajorStatusSecondaryEffectInput(move) {
  if (!move || move.category === "Status") return null;
  const statuses = RANDOM_MAJOR_STATUS_SECONDARY_FUNCTION_CODES_V108[move.function_code] ?? null;
  const effectChance = Number(move.effect_chance ?? 0);
  if (!statuses || effectChance <= 0) return null;
  return {
    calcDamage: 1,
    effectChance,
    functionCode: String(move.function_code),
    randomChoiceValues: [...statuses],
  };
}

export function prepareReflectedMajorStatusBattleInput({ battleInput = {}, pokemon, reflectedBattlerIndex = null } = {}) {
  if (reflectedBattlerIndex === null || reflectedBattlerIndex === undefined) return structuredClone(battleInput);
  const reflectedIndex = Number(reflectedBattlerIndex);
  const prepared = structuredClone(battleInput);
  let targetTypes = null;
  let hasSecondaryEffect = false;
  prepared.rounds = (Array.isArray(prepared.rounds) ? prepared.rounds : []).map((round) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map((action) => {
      if (!action || action.kind !== "move") return action;
      const move = SAFARI_MOVE_MASTERS[action.moveId];
      const flinchInput = directFlinchSecondaryEffectInput(move);
      let preparedAction = action;
      if (flinchInput) {
        hasSecondaryEffect = true;
        preparedAction = {
          ...preparedAction,
          secondaryEffectInputs: [...(Array.isArray(preparedAction.secondaryEffectInputs) ? preparedAction.secondaryEffectInputs : []), flinchInput],
        };
      }

      if (Number(action.targetBattlerIndex) !== reflectedIndex) return preparedAction;
      const directSource = majorStatusMoveEffectSourceCanonical(move);
      const secondarySource = secondaryMajorStatusMoveEffectSourceCanonical(move);
      const randomStatusInput = randomMajorStatusSecondaryEffectInput(move);
      if (!directSource && !secondarySource && !randomStatusInput) return preparedAction;
      targetTypes ??= pokemonTypes(pokemon);

      if (directSource) {
        const effect = resolveMajorStatusMoveEffectCanonical({
          move,
          target: pokemon,
          targetTypes,
          targetBattlerIndex: reflectedIndex,
        });
        if (!effect?.battleStatusInput) return effect ? { ...preparedAction, majorStatusEffectResolution: effect } : preparedAction;
        return {
          ...preparedAction,
          battleStatusInput: effect.battleStatusInput,
          majorStatusEffectResolution: effect,
        };
      }

      if (secondarySource) {
        const effect = resolveSecondaryMajorStatusMoveEffectCanonical({
          move,
          target: pokemon,
          targetTypes,
          targetBattlerIndex: reflectedIndex,
        });
        if (!effect?.battleStatusInput || !effect?.secondaryEffectInput) {
          return effect ? { ...preparedAction, secondaryMajorStatusEffectResolution: effect } : preparedAction;
        }
        hasSecondaryEffect = true;
        const existingSecondaryInputs = Array.isArray(preparedAction.secondaryEffectInputs)
          ? preparedAction.secondaryEffectInputs
          : [];
        const statusSecondaryIndex = existingSecondaryInputs.length;
        return {
          ...preparedAction,
          secondaryEffectInputs: [...existingSecondaryInputs, effect.secondaryEffectInput],
          battleStatusInput: {
            ...effect.battleStatusInput,
            secondaryEffectTargetIndex: statusSecondaryIndex,
          },
          secondaryMajorStatusEffectResolution: effect,
        };
      }

      hasSecondaryEffect = true;
      const existingSecondaryInputs = Array.isArray(preparedAction.secondaryEffectInputs)
        ? preparedAction.secondaryEffectInputs
        : [];
      const statusSecondaryIndex = existingSecondaryInputs.length;
      return {
        ...preparedAction,
        secondaryEffectInputs: [...existingSecondaryInputs, randomStatusInput],
        battleStatusInput: {
          kind: "inflict",
          newStatusFromSecondaryChoice: true,
          newStatusCount: 0,
          targetBattlerIndex: reflectedIndex,
          targetTypes: [...targetTypes],
          requiresAccuracyHit: true,
          commitOnExecutedHit: true,
          secondaryEffectTargetIndex: statusSecondaryIndex,
          requiresDamageDealt: true,
        },
        randomMajorStatusEffectResolution: {
          supported: true,
          functionCode: String(move.function_code),
          statuses: [...randomStatusInput.randomChoiceValues],
          effectChance: Number(move.effect_chance ?? 0),
        },
      };
    }),
  }));

  if (hasSecondaryEffect && prepared.secondaryEffectRandomSeed === undefined && prepared.combatRandomSeed !== undefined) {
    // Secondary effects already have a dedicated canonical seeded owner. Keep
    // them on a deterministic sibling stream without changing the established
    // accuracy/damage transcript used by direct-normal Battle.
    prepared.secondaryEffectRandomSeed = ((Number(prepared.combatRandomSeed) >>> 0) ^ 0x5345434f) & 0x7fffffff;
  }
  return prepared;
}

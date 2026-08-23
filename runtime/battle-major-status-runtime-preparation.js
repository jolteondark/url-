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
  "BurnTargetFlinchTarget",
  "FreezeTargetFlinchTarget",
  "ParalyzeTargetFlinchTarget",
]);

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
      if (!directSource && !secondarySource) return preparedAction;
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

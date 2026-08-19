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

function secondaryFlinchEffectInputCanonical(move) {
  if (!move || move.category === "Status") return null;
  if (move.function_code !== "FlinchTarget") return null;
  const effectChance = Number(move.effect_chance ?? 0);
  if (!(effectChance > 0)) return null;
  return {
    effectChance,
    functionCode: "FlinchTarget",
  };
}

export function prepareReflectedMajorStatusBattleInput({ battleInput = {}, pokemon, reflectedBattlerIndex = null } = {}) {
  const prepared = structuredClone(battleInput);
  let targetTypes = null;
  let hasSecondaryEffect = false;
  const reflectedIndex = reflectedBattlerIndex === null || reflectedBattlerIndex === undefined
    ? null
    : Number(reflectedBattlerIndex);

  prepared.rounds = (Array.isArray(prepared.rounds) ? prepared.rounds : []).map((round) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map((action) => {
      if (!action || action.kind !== "move") return action;
      const move = SAFARI_MOVE_MASTERS[action.moveId];
      let preparedAction = action;

      // Flinch is transient round state rather than persistent Pokemon status.
      // Project only the canonical FunctionCode/EffectChance here; the Battle
      // core applies it to a later target action after seeded chance + damage.
      const flinchInput = secondaryFlinchEffectInputCanonical(move);
      if (flinchInput) {
        hasSecondaryEffect = true;
        preparedAction = {
          ...preparedAction,
          secondaryEffectInputs: [
            ...(Array.isArray(preparedAction.secondaryEffectInputs) ? preparedAction.secondaryEffectInputs : []),
            flinchInput,
          ],
        };
      }

      if (reflectedIndex === null || Number(action.targetBattlerIndex) !== reflectedIndex) return preparedAction;
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
      return {
        ...preparedAction,
        secondaryEffectInputs: [
          ...(Array.isArray(preparedAction.secondaryEffectInputs) ? preparedAction.secondaryEffectInputs : []),
          effect.secondaryEffectInput,
        ],
        battleStatusInput: effect.battleStatusInput,
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

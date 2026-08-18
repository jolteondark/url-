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

export function prepareReflectedMajorStatusBattleInput({ battleInput = {}, pokemon, reflectedBattlerIndex = null } = {}) {
  if (reflectedBattlerIndex === null || reflectedBattlerIndex === undefined) return structuredClone(battleInput);
  const reflectedIndex = Number(reflectedBattlerIndex);
  const prepared = structuredClone(battleInput);
  let targetTypes = null;
  prepared.rounds = (Array.isArray(prepared.rounds) ? prepared.rounds : []).map((round) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map((action) => {
      if (!action || action.kind !== "move" || Number(action.targetBattlerIndex) !== reflectedIndex) return action;
      const move = SAFARI_MOVE_MASTERS[action.moveId];
      const directSource = majorStatusMoveEffectSourceCanonical(move);
      const secondarySource = secondaryMajorStatusMoveEffectSourceCanonical(move);
      if (!directSource && !secondarySource) return action;
      targetTypes ??= pokemonTypes(pokemon);

      if (directSource) {
        const effect = resolveMajorStatusMoveEffectCanonical({
          move,
          target: pokemon,
          targetTypes,
          targetBattlerIndex: reflectedIndex,
        });
        if (!effect?.battleStatusInput) return effect ? { ...action, majorStatusEffectResolution: effect } : action;
        return {
          ...action,
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
        return effect ? { ...action, secondaryMajorStatusEffectResolution: effect } : action;
      }
      return {
        ...action,
        secondaryEffectInputs: [effect.secondaryEffectInput],
        battleStatusInput: effect.battleStatusInput,
        secondaryMajorStatusEffectResolution: effect,
      };
    }),
  }));
  return prepared;
}

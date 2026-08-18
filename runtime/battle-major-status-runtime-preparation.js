import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { safariGeneralPokemonTypesV108 } from "./safari-general-species-type-facts.js";
import { MAJOR_STATUS_MOVE_EFFECT_SOURCE_V108, resolveMajorStatusMoveEffectCanonical } from "./battle-core-major-status-move.js";

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
      if (!move || move.category !== "Status" || move.function_code !== MAJOR_STATUS_MOVE_EFFECT_SOURCE_V108.functionCode) return action;
      targetTypes ??= pokemonTypes(pokemon);
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
    }),
  }));
  return prepared;
}

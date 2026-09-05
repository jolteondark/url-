import { applySafariBagItemToPartyPokemon } from "./safari-bag-item-use.js";
import { isSafariBattleStatBoostItem, useSafariBattleStatBoostItem } from "./safari-battle-stat-boost-item-use.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

export function applySafariBattleItemMutation(runtime, { itemId = "POTION", partyIndex = undefined, moveIndex = undefined } = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.player_replacement_required) throw new Error("player replacement is required before another battle command");

  const targetIndex = partyIndex === undefined ? Number(battle.player_party_index ?? 0) : Number(partyIndex);
  const itemUse = isSafariBattleStatBoostItem(itemId)
    ? useSafariBattleStatBoostItem(runtime, { itemId, partyIndex: targetIndex })
    : applySafariBagItemToPartyPokemon(runtime, {
        itemId,
        partyIndex: targetIndex,
        moveIndex,
        context: "battle",
      });

  return {
    ...itemUse,
    runtime,
    presentation: itemUse.used ? [{
      type: "battle_item",
      actor: "player",
      itemId: itemUse.itemId,
      partyIndex: itemUse.partyIndex,
      moveIndex: itemUse.moveIndex ?? null,
      ppChanges: itemUse.ppChanges ?? null,
      hpBefore: itemUse.hpBefore,
      hpAfter: itemUse.hpAfter,
    }] : [],
  };
}

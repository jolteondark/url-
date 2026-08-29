import { remove } from "./bag-economy-mart-flow.js";
import {
  isPartyRevivalItem,
  partyRevivalItemCanAffectParty,
  resolvePartyRevivalItemEffect,
} from "./item-party-revival-effects.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function itemQuantity(slots, itemId) {
  return (slots ?? []).reduce((total, slot) => {
    if (!slot || slot[0] !== itemId) return total;
    return total + Math.max(0, Math.trunc(Number(slot[1] ?? 0)));
  }, 0);
}

export const isSafariPartyRevivalDirectItem = isPartyRevivalItem;

export function canSafariBagUsePartyRevivalItem(runtime, itemId, { context = "field" } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  if (context !== "field" || !isPartyRevivalItem(id)) return false;
  const state = stateOf(runtime);
  if (state.shop || (state.battle && !state.battle.completed)) return false;
  if (itemQuantity(runtime.bag?.slots, id) <= 0) return false;
  return partyRevivalItemCanAffectParty({ itemId: id, party: runtime.player?.party, context });
}

export function useSafariBagPartyRevivalItem(runtime, { itemId, context = "field" } = {}) {
  const state = stateOf(runtime);
  const id = String(itemId ?? "").toUpperCase();
  if (!isPartyRevivalItem(id)) return { runtime, result: "unsupported_item", used: false, operations: [] };
  if (context !== "field") return { runtime, result: "unsupported_context", used: false, operations: [] };
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", used: false, operations: [] };
  if (state.shop) return { runtime, result: "shop_active", used: false, operations: [] };
  if (itemQuantity(runtime.bag?.slots, id) <= 0) return { runtime, result: "item_missing", used: false, operations: [] };

  const effect = resolvePartyRevivalItemEffect({
    itemId: id,
    party: runtime.player?.party,
    moveMasters: SAFARI_MOVE_MASTERS,
    context,
  });
  if (!effect.used) return { runtime, result: effect.result, used: false, operations: [] };

  const operations = [{ op: "use_item_on_party", item: id, context }];
  for (const target of effect.targets) {
    const before = runtime.player.party[target.partyIndex];
    runtime.player.party[target.partyIndex] = updatePokemonRuntime(before, {
      hp: target.hpAfter,
      status: null,
      status_count: 0,
      moves: target.moves,
    });
    operations.push({
      op: "heal_pokemon_fully",
      item: id,
      party_index: target.partyIndex,
      hp_before: target.hpBefore,
      hp_after: target.hpAfter,
      status_before: target.statusBefore,
      status_after: null,
      restore_pp: true,
    });
  }

  if (effect.consumable) {
    const removed = remove(runtime.bag.slots, id, 1);
    if (!removed) throw new Error(`failed to consume ${id} after successful item validation`);
    operations.push({ op: "remove_item", item: id, quantity: 1 });
  }
  operations.push({ op: "request_save" });
  state.last_operations = operations;
  state.notice = "ひんしのポケモンたちは元気を取り戻しました。";
  return {
    runtime,
    result: "used",
    used: true,
    itemId: id,
    targets: effect.targets,
    operations,
    notice: state.notice,
    persistenceRequested: true,
  };
}

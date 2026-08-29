import { remove } from "./bag-economy-mart-flow.js";
import { isBattleEscapeItem, resolveBattleEscapeItemEffect } from "./item-battle-escape-effects.js";
import { safariBattleCanRun } from "./safari-battle-run-constraint.js";
import { attemptSafariFlee } from "./safari-flee-command.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function canonicalId(itemId) {
  return String(itemId ?? "").toUpperCase();
}

function itemQuantity(slots, itemId) {
  return (slots ?? []).reduce((total, slot) => {
    if (!slot || slot[0] !== itemId) return total;
    return total + Math.max(0, Math.trunc(Number(slot[1] ?? 0)));
  }, 0);
}

export function canSafariUseBattleEscapeItem(runtime, itemId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const id = canonicalId(itemId);
  if (!isBattleEscapeItem(id)) return false;
  if (!battle || battle.completed || battle.origin === "boundary_trial") return false;
  if (battle.player_replacement_required || state.shop) return false;
  if (itemQuantity(runtime?.bag?.slots, id) <= 0) return false;
  return resolveBattleEscapeItemEffect({
    itemId: id,
    wildBattle: battle.kind === "wild",
    canRun: safariBattleCanRun(runtime),
  }).used === true;
}

export function useSafariBattleEscapeItem(runtime, { itemId } = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const id = canonicalId(itemId);
  if (!isBattleEscapeItem(id)) {
    return { runtime, itemId: id, result: "unsupported_item", used: false, turnConsumed: false, operations: [] };
  }
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (battle.player_replacement_required) throw new Error("player replacement is required before another battle command");
  if (state.shop) return { runtime, itemId: id, result: "shop_active", used: false, turnConsumed: false, operations: [] };
  if (itemQuantity(runtime?.bag?.slots, id) <= 0) {
    return { runtime, itemId: id, result: "item_missing", used: false, turnConsumed: false, operations: [] };
  }

  const effect = resolveBattleEscapeItemEffect({
    itemId: id,
    wildBattle: battle.kind === "wild",
    canRun: safariBattleCanRun(runtime),
  });
  if (!effect.used) {
    return {
      runtime,
      itemId: id,
      result: effect.result,
      used: false,
      turnConsumed: false,
      operations: [],
    };
  }

  const result = attemptSafariFlee(runtime, {
    certainEscapeByItem: true,
    commandKind: "item",
  });
  if (!result.escaped || Number(result.decision) !== 3) {
    throw new Error(`${id} validated as a guaranteed escape item but flee owner did not escape`);
  }

  const removed = remove(runtime.bag.slots, id, 1);
  if (!removed) throw new Error(`failed to consume ${id} after successful guaranteed escape`);

  const itemOperations = [
    { op: "use_item_in_battle", item: id, target: "direct" },
    { op: "remove_item", item: id, quantity: 1 },
  ];
  const operations = [...itemOperations, ...(result.operations ?? [])];
  battle.last_operations = operations;
  state.last_operations = operations;

  return {
    ...result,
    itemId: id,
    used: true,
    result: "escaped",
    operations,
    persistenceRequested: true,
  };
}

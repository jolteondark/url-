function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function resolveHeldItemLifecycle(input = {}) {
  const state = clone(input.state || {});
  const operations = [];
  const item = input.itemToUse ?? state.item ?? null;
  if (input.fainted) return { result: "inactive", state, operations };
  if (item == null) return { result: "no_item", state, operations };
  if (!input.itemToUse && input.itemActive === false) return { result: "inactive", state, operations };
  const ownItem = input.ownItem !== false;
  const fling = Boolean(input.fling);
  operations.push({ op: "resolved_item_effect", item, kind: input.effectKind || "generic" });
  if (input.cheekPouch && input.itemIsBerry && input.canHeal) operations.push({ op: "cheek_pouch_heal", fraction: "1/3" });
  if (ownItem) {
    operations.push({ op: "held_item_restoration_before_consume", item, itemIsBerry: Boolean(input.itemIsBerry) });
    if (input.recoverable !== false) {
      state.recycleItem = item;
      state.pickupItem = item;
      state.pickupUse = input.nextPickupUse ?? null;
      operations.push({ op: "set_recycle_pickup", item, pickupUse: state.pickupUse });
    }
    if (input.belch !== false && input.itemIsBerry) {
      state.belched = true;
      operations.push({ op: "set_belched" });
    }
    if (input.permanent !== false && state.item === state.initialItem) {
      state.initialItem = null;
      operations.push({ op: "clear_initial_item" });
    }
    if (state.item != null && input.hasUnburden) {
      state.unburden = true;
      operations.push({ op: "set_unburden" });
    }
    state.item = null;
    state.pokemonItem = null;
    operations.push({ op: "remove_item", permanent: input.permanent !== false });
    operations.push({ op: "runtime_held_item_reflection", item: null });
    operations.push({ op: "held_item_restoration_after_remove" });
  }
  if ((ownItem && input.symbiosis !== false) || (!ownItem && !fling)) {
    const donor = input.symbiosisDonor;
    if (donor && donor.item != null) {
      state.item = donor.item;
      state.pokemonItem = donor.item;
      operations.push({ op: "symbiosis_transfer", item: donor.item, donor: donor.name ?? null });
      if (donor.hasUnburden) operations.push({ op: "donor_unburden", donor: donor.name ?? null });
      operations.push({ op: "runtime_held_item_reflection", item: donor.item });
      operations.push({ op: "held_item_trigger_check_request", item: donor.item });
    }
  }
  return { result: ownItem ? "consumed" : "triggered", state, operations };
}


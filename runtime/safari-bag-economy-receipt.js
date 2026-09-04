function cloneSlots(slots = []) {
  return slots.map((slot) => slot ? [slot[0], Number(slot[1])] : null);
}

export function commitSafariBagEconomyReceipt(runtime, { reward = null, money = 0, moneyDelta = null } = {}) {
  const delta = moneyDelta == null
    ? Math.max(0, Math.trunc(Number(money) || 0))
    : Math.trunc(Number(moneyDelta) || 0);
  if (reward && reward.success !== true) {
    return {
      success:false,
      result:reward.result ?? "reward_failed",
      operations:(reward.operations ?? []).map((entry) => structuredClone(entry)),
    };
  }

  const nextSlots = reward?.pockets?.general?.slots
    ? cloneSlots(reward.pockets.general.slots).filter(Boolean)
    : cloneSlots(runtime?.bag?.slots ?? []).filter(Boolean);
  const previousMoney = Math.max(0, Math.trunc(Number(runtime?.bag?.money ?? 0)));
  const nextMoney = previousMoney + delta;
  if (nextMoney < 0) {
    return {
      success:false,
      result:"insufficient_money",
      operations:(reward?.operations ?? []).map((entry) => structuredClone(entry)),
    };
  }

  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = nextSlots;
  runtime.bag.money = nextMoney;

  const consumed = (reward?.consumed ?? []).map((entry) => ({
    op:"runtime_remove_item",
    item:entry.item,
    quantity:entry.quantity,
  }));
  const granted = (reward?.granted ?? []).map((entry) => ({
    op:"runtime_grant_item",
    item:entry.item,
    quantity:entry.quantity,
  }));
  const operations = [
    ...(reward?.operations ?? []).map((entry) => structuredClone(entry)),
    ...consumed,
    ...granted,
    ...(delta > 0 ? [{ op:"runtime_add_money", amount:delta }] : []),
    ...(delta < 0 ? [{ op:"runtime_spend_money", amount:-delta }] : []),
  ];
  return {
    success:true,
    result:"committed",
    operations,
    consumed:(reward?.consumed ?? []).map((entry) => structuredClone(entry)),
    granted:(reward?.granted ?? []).map((entry) => structuredClone(entry)),
    money:delta,
  };
}

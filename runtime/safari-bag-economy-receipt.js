function cloneSlots(slots = []) {
  return slots.map((slot) => slot ? [slot[0], Number(slot[1])] : null);
}

export function commitSafariBagEconomyReceipt(runtime, { reward = null, money = 0 } = {}) {
  const amount = Math.max(0, Math.trunc(Number(money) || 0));
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

  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = nextSlots;
  runtime.bag.money = previousMoney + amount;

  const granted = (reward?.granted ?? []).map((entry) => ({
    op:"runtime_grant_item",
    item:entry.item,
    quantity:entry.quantity,
  }));
  const operations = [
    ...(reward?.operations ?? []).map((entry) => structuredClone(entry)),
    ...granted,
    ...(amount > 0 ? [{ op:"runtime_add_money", amount }] : []),
  ];
  return {
    success:true,
    result:"committed",
    operations,
    granted:(reward?.granted ?? []).map((entry) => structuredClone(entry)),
    money:amount,
  };
}

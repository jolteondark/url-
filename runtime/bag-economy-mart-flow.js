function int(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${name} must be an integer`);
  return n;
}

function cloneSlots(slots) {
  return (slots ?? []).map(s => s == null ? null : [s[0], int(s[1], "slot count")]);
}

export function quantity(slots, item) {
  let total = 0;
  for (const slot of slots) if (slot && slot[0] === item) total += slot[1];
  return total;
}

export function canAdd(slots, maxSlots, maxPerSlot, item, qty) {
  qty = int(qty, "qty");
  if (qty < 0) throw new RangeError("qty must be non-negative");
  if (qty === 0) return true;
  for (let i = 0; i < maxSlots; i += 1) {
    const slot = slots[i];
    if (!slot) {
      qty -= Math.min(qty, maxPerSlot);
      if (qty === 0) return true;
    } else if (slot[0] === item && slot[1] < maxPerSlot) {
      const newAmount = Math.min(slot[1] + qty, maxPerSlot);
      qty -= newAmount - slot[1];
      if (qty === 0) return true;
    }
  }
  return false;
}

export function add(slots, maxSlots, maxPerSlot, item, qty) {
  qty = int(qty, "qty");
  if (qty < 0) throw new RangeError("qty must be non-negative");
  if (qty === 0) return true;
  for (let i = 0; i < maxSlots; i += 1) {
    const slot = slots[i];
    if (!slot) {
      slots[i] = [item, Math.min(qty, maxPerSlot)];
      qty -= slots[i][1];
      if (qty === 0) return true;
    } else if (slot[0] === item && slot[1] < maxPerSlot) {
      const newAmount = Math.min(slot[1] + qty, maxPerSlot);
      qty -= newAmount - slot[1];
      slot[1] = newAmount;
      if (qty === 0) return true;
    }
  }
  return false;
}

export function remove(slots, item, qty) {
  qty = int(qty, "qty");
  if (qty < 0) throw new RangeError("qty must be non-negative");
  if (qty === 0) return true;
  let complete = false;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!slot || slot[0] !== item) continue;
    const amount = Math.min(qty, slot[1]);
    slot[1] -= amount;
    qty -= amount;
    if (slot[1] === 0) slots[i] = null;
    if (qty === 0) { complete = true; break; }
  }
  const compact = slots.filter(Boolean);
  slots.splice(0, slots.length, ...compact);
  return complete;
}

export function setMoney(value, maxMoney) {
  value = int(value, "money");
  maxMoney = int(maxMoney, "maxMoney");
  return Math.min(Math.max(value, 0), maxMoney);
}

export function buyTransaction(input) {
  const slots = cloneSlots(input.slots);
  const money = int(input.money, "money");
  const unitPrice = int(input.unitPrice, "unitPrice");
  const qty = int(input.qty, "qty");
  const maxSlots = int(input.maxSlots, "maxSlots");
  const maxPerSlot = int(input.maxPerSlot, "maxPerSlot");
  const maxMoney = int(input.maxMoney, "maxMoney");
  if (qty <= 0) return { result: "cancelled", slots, money, added: 0, spent: 0 };
  const price = unitPrice * qty;
  if (money < unitPrice || money < price) return { result: "not_enough_money", slots, money, added: 0, spent: 0 };
  let added = 0;
  for (let i = 0; i < qty; i += 1) {
    if (!add(slots, maxSlots, maxPerSlot, input.item, 1)) break;
    added += 1;
  }
  if (added !== qty) {
    for (let i = 0; i < added; i += 1) {
      if (!remove(slots, input.item, 1)) throw new Error("Failed to delete stored items");
    }
    return { result: "no_room", slots, money, added: 0, spent: 0 };
  }
  const newMoney = setMoney(money - price, maxMoney);
  return { result: "bought", slots, money: newMoney, added, spent: price };
}

export function sellTransaction(input) {
  const slots = cloneSlots(input.slots);
  const money = int(input.money, "money");
  const unitPrice = int(input.unitPrice, "unitPrice");
  const qty = int(input.qty, "qty");
  const maxMoney = int(input.maxMoney, "maxMoney");
  if (!input.canSell || unitPrice <= 0) return { result: "cannot_sell", slots, money, removed: 0, earned: 0 };
  const available = quantity(slots, input.item);
  if (available === 0) return { result: "none_owned", slots, money, removed: 0, earned: 0 };
  if (qty <= 0) return { result: "cancelled", slots, money, removed: 0, earned: 0 };
  if (qty > available) throw new RangeError("sell qty exceeds owned quantity");
  const totalPrice = unitPrice * qty;
  const newMoney = setMoney(money + totalPrice, maxMoney);
  for (let i = 0; i < qty; i += 1) remove(slots, input.item, 1);
  return { result: "sold", slots, money: newMoney, removed: qty, earned: newMoney - money, nominalPrice: totalPrice };
}

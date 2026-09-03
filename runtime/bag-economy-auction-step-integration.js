import { resolveAuctionProductStep } from "./mapless-auction-flow.js";
import { buyTransaction, canAdd, setMoney } from "./bag-economy-mart-flow.js";

function cloneSlots(slots = []) {
  return (slots ?? []).map((slot) => slot == null ? null : [slot[0], Number(slot[1])]);
}

function logicalSlots(slots = []) {
  return slots.filter(Boolean).map((slot) => [slot[0], Number(slot[1])]);
}

function asInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${name} must be an integer`);
  return number;
}

// Shared settlement owner for one resumable auction choice. Auction progression
// stays in mapless-auction-flow; Bag/Money mutation stays in Bag/Economy. This
// integration only commits the owner-produced terminal outcome exactly once.
export function resolveAuctionBagEconomyStep(product = {}, input = {}) {
  const slotsBefore = cloneSlots(input.slots ?? []);
  const moneyBefore = asInteger(input.money ?? 0, "money");
  const maxSlots = asInteger(input.maxSlots ?? slotsBefore.length, "maxSlots");
  const maxPerSlot = asInteger(input.maxPerSlot ?? 999, "maxPerSlot");
  const maxMoney = asInteger(input.maxMoney ?? 9999999, "maxMoney");
  if (moneyBefore < 0 || moneyBefore > maxMoney) throw new RangeError("money must be within Bag limits");

  const item = typeof product?.item === "string" && product.item.length > 0 ? product.item : null;
  if (!product?.fake && !item) throw new TypeError("real auction product item is required");

  const canStore = product?.fake
    ? true
    : canAdd(slotsBefore, maxSlots, maxPerSlot, item, 1);

  const facility = resolveAuctionProductStep(product, {
    choice: input.choice,
    money: moneyBefore,
    spend_money_result: true,
    can_add_items_result: canStore,
    grant_items_result: canStore,
  });

  if (facility.awaiting_choice || Number(facility.money_spent ?? 0) === 0) {
    return {
      result: facility.awaiting_choice ? "awaiting_choice" : (facility.won ? "won_without_payment" : "finished_without_purchase"),
      awaiting_choice: Boolean(facility.awaiting_choice),
      won: Boolean(facility.won),
      product: facility.product,
      slots: logicalSlots(slotsBefore),
      money: moneyBefore,
      spent: 0,
      granted_items: [],
      facility,
      bagOperations: [],
    };
  }

  const spent = asInteger(facility.money_spent, "money_spent");
  if (spent <= 0 || spent > moneyBefore) throw new Error("auction owner produced invalid terminal spend");

  if (facility.product?.fake) {
    const money = setMoney(moneyBefore - spent, maxMoney);
    if (moneyBefore - money !== spent) throw new Error("auction fake-item money settlement mismatch");
    return {
      result: "fake_won",
      awaiting_choice: false,
      won: true,
      product: facility.product,
      slots: logicalSlots(slotsBefore),
      money,
      spent,
      granted_items: [],
      facility,
      bagOperations:[{ op:"set_money", before:moneyBefore, after:money, spent }],
    };
  }

  const purchase = buyTransaction({
    slots: slotsBefore,
    money: moneyBefore,
    item,
    unitPrice: spent,
    qty: 1,
    maxSlots,
    maxPerSlot,
    maxMoney,
  });
  if (purchase.result !== "bought" || purchase.spent !== spent || purchase.added !== 1) {
    throw new Error(`auction facility/Bag settlement mismatch: ${purchase.result}`);
  }

  return {
    result: "purchased",
    awaiting_choice: false,
    won: true,
    product: facility.product,
    slots: logicalSlots(purchase.slots),
    money: purchase.money,
    spent: purchase.spent,
    granted_items: [item],
    facility,
    bagOperations:[
      { op:"bag_add", item, quantity:1, result:true },
      { op:"set_money", before:moneyBefore, after:purchase.money, spent:purchase.spent },
    ],
  };
}

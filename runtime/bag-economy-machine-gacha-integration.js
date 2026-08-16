import { resolveMachineGacha } from "./mapless-machine-gacha-flow.js";
import { canAdd, add, setMoney } from "./bag-economy-mart-flow.js";

function cloneSlots(slots = []) {
  return slots.map((slot) => slot == null ? null : [slot[0], Number(slot[1])]);
}

function logicalSlots(slots = []) {
  return slots.filter(Boolean).map((slot) => [slot[0], Number(slot[1])]);
}

export function resolveMachineGachaBagEconomyIntegration(input = {}) {
  const slotsBefore = cloneSlots(input.slots ?? []);
  const slots = cloneSlots(slotsBefore);
  const moneyBefore = Number(input.money ?? 0);
  const maxSlots = Number(input.maxSlots ?? slotsBefore.length);
  const maxPerSlot = Number(input.maxPerSlot ?? 999);
  const maxMoney = Number(input.maxMoney ?? 9999999);
  const facilityInput = { ...input };
  delete facilityInput.slots;
  delete facilityInput.maxSlots;
  delete facilityInput.maxPerSlot;
  delete facilityInput.maxMoney;
  delete facilityInput.can_add_results;
  delete facilityInput.add_results;

  const probe = resolveMachineGacha({
    ...facilityInput,
    money: moneyBefore,
    can_add_results: [],
    add_results: [],
  });
  const candidateAdds = probe.operations.filter((op) => op.op === "bag_can_add");
  const canAddResults = [];
  const addResults = [];
  const bagOperations = [];

  for (const request of candidateAdds) {
    const canAddResult = canAdd(slots, maxSlots, maxPerSlot, request.item, Number(request.quantity));
    canAddResults.push(canAddResult);
    bagOperations.push({ op: "can_add", item: request.item, quantity: Number(request.quantity), result: canAddResult });
    if (!canAddResult) break;
    const addResult = add(slots, maxSlots, maxPerSlot, request.item, Number(request.quantity));
    addResults.push(addResult);
    bagOperations.push({ op: "add", item: request.item, quantity: Number(request.quantity), result: addResult });
    if (!addResult) break;
  }

  const facility = resolveMachineGacha({
    ...facilityInput,
    money: moneyBefore,
    can_add_results: canAddResults,
    add_results: addResults,
  });
  const expectedDraws = bagOperations.filter((op) => op.op === "add" && op.result).length;
  if (Number(facility.draws) !== expectedDraws) {
    throw new Error("Machine Gacha facility/Bag draw count mismatch");
  }
  const money = setMoney(moneyBefore + Number(facility.money_delta ?? 0), maxMoney);
  const spent = moneyBefore - money;
  if (spent !== -Number(facility.money_delta ?? 0)) {
    throw new Error("Machine Gacha facility/Money delta mismatch");
  }
  if (spent > 0) bagOperations.push({ op: "set_money", before: moneyBefore, after: money, spent });

  return {
    outcome: facility.outcome,
    draws: Number(facility.draws),
    slots: logicalSlots(slots),
    money,
    spent,
    facility,
    bagOperations,
  };
}

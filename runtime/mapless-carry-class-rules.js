const freezeSupplies = (entries) => Object.freeze(entries.map(([item, quantity]) => Object.freeze([item, quantity])));
const ratio = (numerator, denominator) => Object.freeze({ numerator, denominator });

export const MAPLESS_CARRY_CLASS_RULES = Object.freeze({
  general: Object.freeze({
    partyLimit: 6,
    startingMoney: ratio(1, 1),
    moneyGain: ratio(1, 1),
    sellPrice: ratio(1, 1),
    supplies: freezeSupplies([["POKEBALL", 5], ["POTION", 3]]),
  }),
  pseudo_final: Object.freeze({
    partyLimit: 6,
    startingMoney: ratio(1, 2),
    moneyGain: ratio(1, 1),
    sellPrice: ratio(1, 1),
    supplies: freezeSupplies([]),
  }),
  special: Object.freeze({
    partyLimit: 5,
    startingMoney: ratio(1, 4),
    moneyGain: ratio(9, 10),
    sellPrice: ratio(17, 20),
    supplies: freezeSupplies([["POKEBALL", 1], ["POTION", 1]]),
  }),
  legend: Object.freeze({
    partyLimit: 5,
    startingMoney: ratio(0, 1),
    moneyGain: ratio(4, 5),
    sellPrice: ratio(13, 20),
    supplies: freezeSupplies([]),
  }),
});

export function maplessCarryClassRule(carryClass = "general") {
  const key = String(carryClass ?? "general");
  return MAPLESS_CARRY_CLASS_RULES[key] ?? MAPLESS_CARRY_CLASS_RULES.general;
}

function floorRatio(value, rule) {
  const amount = Math.max(0, Math.trunc(Number(value) || 0));
  return Math.floor((amount * rule.numerator) / rule.denominator);
}

export function maplessCarryStartingMoney(baseMoney, carryClass = "general") {
  return floorRatio(baseMoney, maplessCarryClassRule(carryClass).startingMoney);
}

export function maplessCarryMoneyGain(amount, carryClass = "general") {
  return floorRatio(amount, maplessCarryClassRule(carryClass).moneyGain);
}

export function maplessCarrySellPrice(unitPrice, carryClass = "general") {
  return floorRatio(unitPrice, maplessCarryClassRule(carryClass).sellPrice);
}

export function safariCarryoverPartyLimit(carryClass = "general") {
  return maplessCarryClassRule(carryClass).partyLimit;
}

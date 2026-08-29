export const HP_HEALING_ITEM_EFFECT_SOURCE = Object.freeze({
  mechanicsGeneration: 9,
  rebalancedHealingItemAmounts: true,
  rageCandyBarCuresStatusProblems: true,
});

function fixed(amount, happinessMethod = null) {
  return Object.freeze({ kind: "fixed", amount, happinessMethod });
}

export const HP_HEALING_ITEM_EFFECTS = Object.freeze({
  POTION: fixed(20),
  BERRYJUICE: fixed(20),
  SWEETHEART: fixed(20),
  SUPERPOTION: fixed(60),
  HYPERPOTION: fixed(120),
  MAXPOTION: Object.freeze({ kind: "full", happinessMethod: null }),
  FRESHWATER: fixed(30),
  SODAPOP: fixed(50),
  LEMONADE: fixed(70),
  MOOMOOMILK: fixed(100),
  ORANBERRY: fixed(10),
  SITRUSBERRY: Object.freeze({ kind: "quarter", happinessMethod: null }),
  ENERGYPOWDER: fixed(60, "powder"),
  ENERGYROOT: fixed(120, "energyroot"),
  CANARIBREAD: fixed(100),
});

function integer(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${field} must be an integer`);
  return number;
}

export function isHpHealingItem(itemId) {
  const id = String(itemId ?? "").toUpperCase();
  return Object.prototype.hasOwnProperty.call(HP_HEALING_ITEM_EFFECTS, id);
}

export function applyBitterMedicineHappiness(happiness, method) {
  const value = integer(happiness, "happiness");
  if (value < 0 || value > 255) throw new RangeError("happiness must be in 0..255");
  if (method == null) return value;
  const band = Math.min(2, Math.floor(value / 100));
  const table = method === "powder" ? [-5, -5, -10]
    : method === "energyroot" ? [-10, -10, -15]
      : method === "revivalherb" ? [-15, -15, -20]
        : null;
  if (!table) throw new RangeError(`unknown happiness method: ${method}`);
  return Math.max(0, Math.min(255, value + table[band]));
}

export function resolveHpHealingItemEffect({ itemId, hp, maxHp } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = HP_HEALING_ITEM_EFFECTS[id];
  if (!effect) {
    return { itemId: id, supported: false, used: false, result: "unsupported_item" };
  }

  const hpBefore = integer(hp, "hp");
  const totalHp = integer(maxHp, "maxHp");
  if (totalHp < 1) throw new RangeError("maxHp must be positive");
  if (hpBefore < 0 || hpBefore > totalHp) throw new RangeError("hp must be in 0..maxHp");
  if (hpBefore <= 0) {
    return { itemId: id, supported: true, used: false, result: "fainted_target", hpBefore, hpAfter: hpBefore, hpGain: 0 };
  }
  if (hpBefore >= totalHp) {
    return { itemId: id, supported: true, used: false, result: "no_effect", hpBefore, hpAfter: hpBefore, hpGain: 0 };
  }

  let restoreAmount;
  let effectName;
  if (effect.kind === "fixed") {
    restoreAmount = effect.amount;
    effectName = "hp_fixed";
  } else if (effect.kind === "full") {
    restoreAmount = totalHp - hpBefore;
    effectName = "hp_full";
  } else if (effect.kind === "quarter") {
    restoreAmount = Math.floor(totalHp / 4);
    effectName = "hp_quarter";
  } else {
    throw new RangeError(`unknown HP healing effect kind: ${effect.kind}`);
  }

  const hpAfter = Math.min(totalHp, hpBefore + restoreAmount);
  return {
    itemId: id,
    supported: true,
    used: true,
    result: "used",
    effect: effectName,
    hpBefore,
    hpAfter,
    hpGain: hpAfter - hpBefore,
    happinessMethod: effect.happinessMethod ?? null,
  };
}

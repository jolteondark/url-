export const REVIVAL_ITEM_EFFECT_SOURCE = Object.freeze({
  essentialsVersion: "21.1",
  mechanicsGeneration: 9,
});

export const REVIVAL_ITEM_EFFECTS = Object.freeze({
  REVIVE: Object.freeze({ kind: "half", happinessMethod: null }),
  MAXREVIVE: Object.freeze({ kind: "full", happinessMethod: null }),
  MAXHONEY: Object.freeze({ kind: "full", happinessMethod: null }),
  REVIVALHERB: Object.freeze({ kind: "full", happinessMethod: "revivalherb" }),
});

function integer(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${field} must be an integer`);
  return number;
}

export function isRevivalItem(itemId) {
  const id = String(itemId ?? "").toUpperCase();
  return Object.prototype.hasOwnProperty.call(REVIVAL_ITEM_EFFECTS, id);
}

export function resolveRevivalItemEffect({ itemId, hp, maxHp } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = REVIVAL_ITEM_EFFECTS[id];
  if (!effect) {
    return { itemId: id, supported: false, used: false, result: "unsupported_item" };
  }

  const hpBefore = integer(hp, "hp");
  const totalHp = integer(maxHp, "maxHp");
  if (totalHp < 1) throw new RangeError("maxHp must be positive");
  if (hpBefore < 0 || hpBefore > totalHp) throw new RangeError("hp must be in 0..maxHp");
  if (hpBefore > 0) {
    return {
      itemId: id,
      supported: true,
      used: false,
      result: "no_effect",
      hpBefore,
      hpAfter: hpBefore,
      hpGain: 0,
    };
  }

  const hpAfter = effect.kind === "half"
    ? Math.max(1, Math.floor(totalHp / 2))
    : totalHp;
  if (effect.kind !== "half" && effect.kind !== "full") {
    throw new RangeError(`unknown revival effect kind: ${effect.kind}`);
  }

  return {
    itemId: id,
    supported: true,
    used: true,
    result: "used",
    effect: effect.kind === "half" ? "revive_half" : "revive_full",
    hpBefore,
    hpAfter,
    hpGain: hpAfter - hpBefore,
    curesStatus: true,
    happinessMethod: effect.happinessMethod ?? null,
  };
}

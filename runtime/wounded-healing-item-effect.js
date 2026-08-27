import {
  HP_HEALING_ITEM_EFFECT_SOURCE,
  applyBitterMedicineHappiness,
  resolveHpHealingItemEffect,
} from "./item-hp-healing-effects.js";

export const WOUNDED_ITEM_EFFECT_SOURCE = HP_HEALING_ITEM_EFFECT_SOURCE;

const NO_FIELD_HP_HANDLER = new Set([
  "FIGYBERRY", "WIKIBERRY", "MAGOBERRY", "AGUAVBERRY", "IAPAPABERRY", "ENIGMABERRY",
]);

function integer(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${field} must be an integer`);
  return number;
}

function normalizeStatus(value) {
  const status = String(value ?? "NONE").toUpperCase();
  return status || "NONE";
}

function result(itemId, hpBefore, hpAfter, statusBefore, statusAfter, used, effect, happinessMethod = null) {
  return {
    itemId,
    used,
    effect,
    hp_before: hpBefore,
    hp_after: hpAfter,
    hp_gain: hpAfter - hpBefore,
    status_before: statusBefore,
    status_after: statusAfter,
    happiness_method: happinessMethod,
  };
}

export function resolveWoundedHealingItemEffect(input = {}) {
  const itemId = String(input.itemId ?? "").toUpperCase();
  const hp = integer(input.hp, "hp");
  const maxHp = integer(input.maxHp, "maxHp");
  if (maxHp < 1) throw new RangeError("maxHp must be positive");
  if (hp < 0 || hp > maxHp) throw new RangeError("hp must be in 0..maxHp");
  const status = normalizeStatus(input.status);
  if (hp <= 0) return result(itemId, hp, hp, status, status, false, "fainted");

  const healing = resolveHpHealingItemEffect({ itemId, hp, maxHp });
  if (healing.supported) {
    return result(
      itemId,
      hp,
      healing.hpAfter,
      status,
      status,
      healing.used,
      healing.effect ?? healing.result,
      healing.happinessMethod ?? null,
    );
  }

  if (itemId === "FULLRESTORE") {
    if (hp === maxHp && status === "NONE") return result(itemId, hp, hp, status, status, false, "no_effect");
    return result(itemId, hp, maxHp, status, "NONE", true, "hp_full_status");
  }
  if (itemId === "RAGECANDYBAR") {
    if (status === "NONE") return result(itemId, hp, hp, status, status, false, "no_effect");
    return result(itemId, hp, hp, status, "NONE", true, "status_only");
  }
  if (NO_FIELD_HP_HANDLER.has(itemId)) {
    return result(itemId, hp, hp, status, status, false, "no_field_handler");
  }
  return result(itemId, hp, hp, status, status, false, "unsupported_item");
}

export function applyWoundedHappinessEffect(happiness, method) {
  const value = integer(happiness, "happiness");
  if (value < 0 || value > 255) throw new RangeError("happiness must be in 0..255");
  return applyBitterMedicineHappiness(value, method);
}

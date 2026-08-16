export const WOUNDED_ITEM_EFFECT_SOURCE = Object.freeze({
  mechanicsGeneration: 9,
  rebalancedHealingItemAmounts: true,
  rageCandyBarCuresStatusProblems: true,
});

const FIXED_HP = Object.freeze({
  POTION: 20,
  BERRYJUICE: 20,
  SWEETHEART: 20,
  SUPERPOTION: 60,
  HYPERPOTION: 120,
  FRESHWATER: 30,
  SODAPOP: 50,
  LEMONADE: 70,
  MOOMOOMILK: 100,
  ORANBERRY: 10,
  ENERGYPOWDER: 60,
  ENERGYROOT: 120,
  CANARIBREAD: 100,
});

const NO_FIELD_HP_HANDLER = new Set([
  'FIGYBERRY', 'WIKIBERRY', 'MAGOBERRY', 'AGUAVBERRY', 'IAPAPABERRY', 'ENIGMABERRY',
]);

function integer(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${field} must be an integer`);
  return number;
}

function normalizeStatus(value) {
  const status = String(value ?? 'NONE').toUpperCase();
  return status || 'NONE';
}

function clampHp(value, maxHp) {
  return Math.max(0, Math.min(value, maxHp));
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
  const itemId = String(input.itemId ?? '').toUpperCase();
  const hp = integer(input.hp, 'hp');
  const maxHp = integer(input.maxHp, 'maxHp');
  if (maxHp < 1) throw new RangeError('maxHp must be positive');
  if (hp < 0 || hp > maxHp) throw new RangeError('hp must be in 0..maxHp');
  const status = normalizeStatus(input.status);
  if (hp <= 0) return result(itemId, hp, hp, status, status, false, 'fainted');
  if (Object.prototype.hasOwnProperty.call(FIXED_HP, itemId)) {
    if (hp >= maxHp) return result(itemId, hp, hp, status, status, false, 'no_effect');
    const after = clampHp(hp + FIXED_HP[itemId], maxHp);
    const happinessMethod = itemId === 'ENERGYPOWDER' ? 'powder'
      : itemId === 'ENERGYROOT' ? 'energyroot' : null;
    return result(itemId, hp, after, status, status, after > hp, 'hp_fixed', happinessMethod);
  }
  if (itemId === 'MAXPOTION') {
    if (hp >= maxHp) return result(itemId, hp, hp, status, status, false, 'no_effect');
    return result(itemId, hp, maxHp, status, status, true, 'hp_full');
  }
  if (itemId === 'FULLRESTORE') {
    if (hp === maxHp && status === 'NONE') return result(itemId, hp, hp, status, status, false, 'no_effect');
    return result(itemId, hp, maxHp, status, 'NONE', true, 'hp_full_status');
  }
  if (itemId === 'SITRUSBERRY') {
    if (hp >= maxHp) return result(itemId, hp, hp, status, status, false, 'no_effect');
    const after = clampHp(hp + Math.floor(maxHp / 4), maxHp);
    return result(itemId, hp, after, status, status, after > hp, 'hp_quarter');
  }
  if (itemId === 'RAGECANDYBAR') {
    if (status === 'NONE') return result(itemId, hp, hp, status, status, false, 'no_effect');
    return result(itemId, hp, hp, status, 'NONE', true, 'status_only');
  }
  if (NO_FIELD_HP_HANDLER.has(itemId)) {
    return result(itemId, hp, hp, status, status, false, 'no_field_handler');
  }
  return result(itemId, hp, hp, status, status, false, 'unsupported_item');
}

export function applyWoundedHappinessEffect(happiness, method) {
  const value = integer(happiness, 'happiness');
  if (value < 0 || value > 255) throw new RangeError('happiness must be in 0..255');
  if (method == null) return value;
  const band = Math.min(2, Math.floor(value / 100));
  const table = method === 'powder' ? [-5, -5, -10]
    : method === 'energyroot' ? [-10, -10, -15]
      : null;
  if (!table) throw new RangeError(`unknown happiness method: ${method}`);
  return Math.max(0, Math.min(255, value + table[band]));
}

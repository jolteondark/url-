import { MAPLESS_DAY_BOARD_TYPE_IDS_V108 } from "./mapless-normal-event-extra-trainer-pokemon.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const MAPLESS_OLD_STATUE_STATUS_ORDER_V108 = Object.freeze([
  "POISON", "PARALYSIS", "BURN", "SLEEP",
]);

export const MAPLESS_OLD_STATUE_BONUS_STAT_ORDER_V108 = Object.freeze([
  "HP", "ATTACK", "DEFENSE", "SPECIAL_ATTACK", "SPECIAL_DEFENSE", "SPEED",
]);

export const MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108 = Object.freeze([
  "NUGGET", "STARPIECE", "COMETSHARD",
]);

export const MAPLESS_OLD_STATUE_MINERAL_ITEMS_V108 = Object.freeze([
  "NUGGET", "STARPIECE", "COMETSHARD", "HARDSTONE",
]);

function integer(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${label} must be an integer`);
  return number;
}

function selectFrom(pool, randomInt, label) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  if (typeof randomInt !== "function") throw new TypeError(`${label} randomInt is required`);
  const index = Number(randomInt(pool.length));
  if (!Number.isInteger(index) || index < 0 || index >= pool.length) throw new RangeError(`${label} randomInt returned out-of-range index`);
  return { value: pool[index], index };
}

export function resolveMaplessOldStatueOutcomeV108({ normalSeed, roll, goodLimit, neutralLimit } = {}) {
  const seed = integer(normalSeed, "normalSeed");
  const resolvedRoll = integer(roll, "roll");
  const good = integer(goodLimit, "goodLimit");
  const neutral = integer(neutralLimit, "neutralLimit");
  const rng = new RubyMT19937Random((seed + resolvedRoll) >>> 0);
  if (resolvedRoll < good) {
    return Object.freeze({ branch:"good", effectIndex:rng.randInt(6), status:null });
  }
  if (resolvedRoll < neutral) {
    return Object.freeze({ branch:"neutral", effectIndex:rng.randInt(3), status:null });
  }
  const effectIndex = rng.randInt(3);
  const status = effectIndex === 0 ? MAPLESS_OLD_STATUE_STATUS_ORDER_V108[rng.randInt(4)] : null;
  return Object.freeze({ branch:"bad", effectIndex, status });
}

export function selectMaplessOldStatueBattleTypeV108(randomInt) {
  return selectFrom(MAPLESS_DAY_BOARD_TYPE_IDS_V108, randomInt, "Old Statue battle type");
}

export function selectMaplessOldStatueBonusStatV108(randomInt) {
  return selectFrom(MAPLESS_OLD_STATUE_BONUS_STAT_ORDER_V108, randomInt, "Old Statue bonus stat");
}

export function selectMaplessOldStatueTreasureV108(validItems, randomInt) {
  const valid = new Set((validItems ?? []).map(String));
  return selectFrom(MAPLESS_OLD_STATUE_TREASURE_ITEMS_V108.filter((id) => valid.has(id)), randomInt, "Old Statue treasure");
}

export function selectMaplessOldStatueMineralV108(validItems, randomInt) {
  const valid = new Set((validItems ?? []).map(String));
  return selectFrom(MAPLESS_OLD_STATUE_MINERAL_ITEMS_V108.filter((id) => valid.has(id)), randomInt, "Old Statue mineral");
}

export function selectMaplessOldStatueLostLowItemV108(ownedLowItems, randomInt) {
  return selectFrom((ownedLowItems ?? []).map(String), randomInt, "Old Statue lost low item");
}

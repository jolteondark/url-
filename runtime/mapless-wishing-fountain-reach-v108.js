import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const MAPLESS_WISHING_FOUNTAIN_REACH_BATTLE_TYPES = Object.freeze(["WATER", "GHOST"]);
export const MAPLESS_WISHING_FOUNTAIN_REACH_STATUSES = Object.freeze(["POISON", "PARALYSIS", "BURN", "SLEEP"]);

function seeded(normalSeed) {
  const seed = Number(normalSeed);
  if (!Number.isInteger(seed)) throw new TypeError("normalSeed must be an integer");
  return new RubyMT19937Random(seed >>> 0);
}

export function resolveMaplessWishingFountainReachBattleTypeV108(normalSeed) {
  const rng = seeded(normalSeed);
  return MAPLESS_WISHING_FOUNTAIN_REACH_BATTLE_TYPES[rng.randInt(MAPLESS_WISHING_FOUNTAIN_REACH_BATTLE_TYPES.length)];
}

export function resolveMaplessWishingFountainReachStatusV108(normalSeed) {
  const rng = seeded(normalSeed);
  return MAPLESS_WISHING_FOUNTAIN_REACH_STATUSES[rng.randInt(MAPLESS_WISHING_FOUNTAIN_REACH_STATUSES.length)];
}

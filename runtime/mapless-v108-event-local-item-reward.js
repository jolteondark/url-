import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { hasMaplessV108ItemMetadata } from "./mapless-v108-item-metadata.js";
import { MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS } from "./mapless-normal-event-small-reward.js";
import { maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";

export const MAPLESS_V108_DRINK_ITEMS = Object.freeze([
  "FRESHWATER", "SODAPOP", "LEMONADE", "MOOMOOMILK",
]);

export const MAPLESS_V108_BALL_ITEMS = Object.freeze([
  "POKEBALL", "PREMIERBALL", "GREATBALL", "HEALBALL", "NETBALL", "NESTBALL",
  "REPEATBALL", "DIVEBALL", "DUSKBALL", "QUICKBALL", "TIMERBALL", "ULTRABALL",
]);

export const MAPLESS_V108_MID_ITEMS = Object.freeze([
  "SUPERPOTION", "HYPERPOTION", "FULLHEAL", "ETHER", "GREATBALL", "ULTRABALL",
  "QUICKBALL", "DUSKBALL", "TIMERBALL", "REVIVE", "LEMONADE", "MOOMOOMILK",
  "NUGGET", "STARDUST",
]);

export const MAPLESS_V108_LARGE_ITEMS = Object.freeze([
  "MAXPOTION", "FULLRESTORE", "MAXETHER", "ELIXIR", "MAXREVIVE", "RARECANDY",
  "STARPIECE", "COMETSHARD", "PPUP", "ABILITYCAPSULE", "FASTBALL", "LEVELBALL",
  "LUREBALL", "HEAVYBALL", "LOVEBALL", "FRIENDBALL", "MOONBALL", "DREAMBALL",
]);

function existingItems(ids) {
  const seen = new Set();
  return ids.filter((itemId) => {
    if (seen.has(itemId) || !hasMaplessV108ItemMetadata(itemId)) return false;
    seen.add(itemId);
    return true;
  });
}

function seededPicker(seed) {
  return new RubyMT19937Random(Number(seed ?? 0) & 0x7fffffff);
}

function drawWithReplacement(pool, count, rng) {
  if (pool.length === 0 || count <= 0) return [];
  return Array.from({ length: count }, () => pool[rng.randInt(pool.length)]);
}

function drawUnique(pool, count, rng) {
  const source = [...pool];
  const result = [];
  for (let draw = 0; draw < count && source.length > 0; draw += 1) {
    result.push(source.splice(rng.randInt(source.length), 1)[0]);
  }
  return result;
}

export function resolveMaplessV108HotSpringBottleReward(seed) {
  const pool = existingItems(MAPLESS_V108_DRINK_ITEMS);
  if (pool.length === 0) return [];
  const rng = seededPicker(seed);
  return drawWithReplacement(pool, 1 + rng.randInt(2), rng);
}

export function resolveMaplessV108FloodedRiverReward(seed, action) {
  const rng = seededPicker(seed);
  if (action === "water") {
    const pool = existingItems([
      ...MAPLESS_V108_BALL_ITEMS,
      ...MAPLESS_V108_DRINK_ITEMS,
      "ORANBERRY", "PECHABERRY", "CHERIBERRY",
    ]);
    if (pool.length === 0) return [];
    return drawWithReplacement(pool, 1 + rng.randInt(2), rng);
  }
  if (action === "ice") {
    const pool = existingItems([
      ...MAPLESS_V108_MID_ITEMS,
      "NUGGET", "STARDUST", "HARDSTONE",
    ]);
    if (pool.length === 0) return [];
    return drawWithReplacement(pool, 1, rng);
  }
  throw new RangeError("action must be water or ice");
}

export function resolveMaplessV108BurningWagonWaterReward(seed, day = 1) {
  const canonicalPool = maplessNormalEventScalingValue(day) <= 1
    ? MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS
    : [...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_V108_MID_ITEMS];
  const pool = existingItems(canonicalPool);
  if (pool.length === 0) return [];
  const rng = seededPicker(seed);
  return drawWithReplacement(pool, 2 + rng.randInt(2), rng);
}

export function resolveMaplessV108BurningWagonFireChoices(seed) {
  const pool = existingItems([...MAPLESS_V108_LARGE_ITEMS, ...MAPLESS_V108_MID_ITEMS]);
  if (pool.length === 0) return [];
  const rng = seededPicker(seed);
  rng.randInt(100); // prepare_fixed_data draws manual_roll before fire_choices.
  return drawUnique(pool, 3, rng);
}

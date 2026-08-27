import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { hasMaplessV108ItemMetadata } from "./mapless-v108-item-metadata.js";

export const MAPLESS_V108_METEOR_STONE_ITEMS = Object.freeze([
  "FIRESTONE", "THUNDERSTONE", "WATERSTONE", "LEAFSTONE", "MOONSTONE",
  "SUNSTONE", "SHINYSTONE", "DUSKSTONE", "DAWNSTONE", "ICESTONE",
]);

export const MAPLESS_V108_METEOR_ITEMS = Object.freeze([
  "STARDUST", "STARPIECE", "COMETSHARD", "IRONBALL", "METALCOAT", "HARDSTONE", "FLOATSTONE",
]);

export const MAPLESS_V108_METEOR_STEEL_ITEMS = Object.freeze([
  "STARDUST", "STARPIECE", "NUGGET", "METALCOAT", "IRONBALL", "HARDSTONE",
]);

export const MAPLESS_V108_METEOR_CARRY_ITEMS = Object.freeze([
  "NUGGET", "STARPIECE", "COMETSHARD",
]);

export const MAPLESS_V108_METEOR_STAR_ITEMS = Object.freeze([
  "STARDUST", "STARPIECE", "COMETSHARD",
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

function drawUnique(pool, count, rng) {
  const source = [...pool];
  const result = [];
  for (let draw = 0; draw < count && source.length > 0; draw += 1) {
    result.push(source.splice(rng.randInt(source.length), 1)[0]);
  }
  return result;
}

function drawOne(pool, rng) {
  return pool.length > 0 ? pool[rng.randInt(pool.length)] : null;
}

export function hydrateMaplessV108MeteorFragmentFixedData(seed, normalData = {}) {
  const data = { ...(normalData ?? {}) };
  const rng = seededPicker(seed);
  if (data.smash_roll == null) data.smash_roll = rng.randInt(100);
  if (data.rock_choices == null) {
    const pool = existingItems([...MAPLESS_V108_METEOR_STONE_ITEMS, ...MAPLESS_V108_METEOR_ITEMS]);
    data.rock_choices = drawUnique(pool, 3, rng);
  } else if (Array.isArray(data.rock_choices)) {
    data.rock_choices = [...data.rock_choices];
  }
  return data;
}

export function resolveMaplessV108MeteorFragmentReward(seed, action, input = {}) {
  const rng = seededPicker(seed);
  if (action === "rock") {
    const choices = Array.isArray(input.rockChoices) ? input.rockChoices : [];
    const choice = String(input.rockChoice ?? "");
    if (!choice || !choices.includes(choice) || !hasMaplessV108ItemMetadata(choice)) {
      return { kind: "invalid_rock_choice", items: [] };
    }
    return { kind: "items", items: [choice] };
  }
  if (action === "steel") {
    const pool = existingItems(MAPLESS_V108_METEOR_STEEL_ITEMS);
    const count = 2 + rng.randInt(2);
    const items = [];
    for (let draw = 0; draw < count && pool.length > 0; draw += 1) items.push(drawOne(pool, rng));
    return { kind: "items", items };
  }
  if (action === "carry") {
    const pool = existingItems(MAPLESS_V108_METEOR_CARRY_ITEMS);
    const item = drawOne(pool, rng);
    return { kind: "items", items: item ? [item] : [] };
  }
  if (action === "smash") {
    const roll = Number(input.smashRoll);
    if (!Number.isFinite(roll)) throw new TypeError("smashRoll is required for smash");
    if (roll < 55) {
      const item = drawOne(existingItems(MAPLESS_V108_METEOR_STONE_ITEMS), rng);
      return { kind: "items", items: item ? [item] : [] };
    }
    if (roll < 80) {
      const item = drawOne(existingItems(MAPLESS_V108_METEOR_STAR_ITEMS), rng);
      return { kind: "items", items: item ? [item] : [] };
    }
    if (roll < 90) return { kind: "shared_large", tier: "large", count: 1, items: [] };
    return { kind: "none", items: [] };
  }
  throw new RangeError("action must be rock, steel, carry, or smash");
}

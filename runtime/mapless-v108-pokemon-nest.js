import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { MAPLESS_V108_BERRY_IDS } from "./mapless-v108-berry-catalog.js";
import { MAPLESS_V108_MID_ITEMS } from "./mapless-v108-event-local-item-reward.js";
import { hasMaplessV108ItemMetadata } from "./mapless-v108-item-metadata.js";

export const MAPLESS_V108_POKEMON_NEST_SEARCH_ITEMS = Object.freeze([
  ...MAPLESS_V108_BERRY_IDS,
  ...MAPLESS_V108_MID_ITEMS,
]);

export function maplessV108PokemonNestSearchPool(itemExists = hasMaplessV108ItemMetadata) {
  const exists = typeof itemExists === "function" ? itemExists : hasMaplessV108ItemMetadata;
  return MAPLESS_V108_POKEMON_NEST_SEARCH_ITEMS.filter((itemId) => exists(itemId));
}

export function resolveMaplessV108PokemonNestSearchReward(seed, options = {}) {
  const pool = maplessV108PokemonNestSearchPool(options.itemExists);
  if (pool.length === 0) return { kind: "none", items: [] };
  const rng = new RubyMT19937Random(Number(seed ?? 0) & 0x7fffffff);
  return { kind: "items", items: [pool[rng.randInt(pool.length)]] };
}

import assert from "node:assert/strict";
import { RubyMT19937Random } from "../runtime/ruby-mt19937-random.js";
import { MAPLESS_V108_BERRY_IDS } from "../runtime/mapless-v108-berry-catalog.js";
import { MAPLESS_V108_MID_ITEMS } from "../runtime/mapless-v108-event-local-item-reward.js";
import {
  MAPLESS_V108_POKEMON_NEST_SEARCH_ITEMS,
  maplessV108PokemonNestSearchPool,
  resolveMaplessV108PokemonNestSearchReward,
} from "../runtime/mapless-v108-pokemon-nest.js";

assert.deepEqual(
  MAPLESS_V108_POKEMON_NEST_SEARCH_ITEMS,
  [...MAPLESS_V108_BERRY_IDS, ...MAPLESS_V108_MID_ITEMS],
  "Pokémon Nest pool must preserve frozen all_berry_ids + MID_ITEMS order",
);

const seed = 123456789;
const expectedRng = new RubyMT19937Random(seed);
const expectedPool = maplessV108PokemonNestSearchPool();
const expectedItem = expectedPool[expectedRng.randInt(expectedPool.length)];
assert.deepEqual(
  resolveMaplessV108PokemonNestSearchReward(seed),
  { kind: "items", items: [expectedItem] },
  "search reward must use the first draw from fresh Ruby MT19937 seeded directly by normal_seed",
);

assert.deepEqual(
  resolveMaplessV108PokemonNestSearchReward(seed, { itemExists: () => false }),
  { kind: "none", items: [] },
  "empty canonical pool must return explicit no-reward without fallback",
);

console.log("pokemon-nest-v108 smoke: ok");

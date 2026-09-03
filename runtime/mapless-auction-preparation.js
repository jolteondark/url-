const LOW_ITEMS = Object.freeze([
  "POTION","ANTIDOTE","PARALYZEHEAL","AWAKENING","BURNHEAL","ICEHEAL",
  "POKEBALL","ORANBERRY","PECHABERRY","CHERIBERRY","FRESHWATER","SODAPOP",
]);
const MID_ITEMS = Object.freeze([
  "SUPERPOTION","HYPERPOTION","FULLHEAL","ETHER","GREATBALL","ULTRABALL",
  "QUICKBALL","DUSKBALL","TIMERBALL","REVIVE","LEMONADE","MOOMOOMILK",
  "NUGGET","STARDUST",
]);
const LARGE_ITEMS = Object.freeze([
  "MAXPOTION","FULLRESTORE","MAXETHER","ELIXIR","MAXREVIVE","RARECANDY",
  "STARPIECE","COMETSHARD","PPUP","ABILITYCAPSULE","FASTBALL","LEVELBALL",
  "LUREBALL","HEAVYBALL","LOVEBALL","FRIENDBALL","MOONBALL","DREAMBALL",
]);

function scalingValue(day) {
  return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0);
}

function poolFor(size, day, existingItems) {
  const scale = scalingValue(day);
  let pool;
  if (size === "small") pool = LOW_ITEMS;
  else if (size === "medium") pool = scale <= 1 ? LOW_ITEMS : [...LOW_ITEMS, ...MID_ITEMS];
  else pool = scale <= 2 ? MID_ITEMS : [...MID_ITEMS, ...LARGE_ITEMS];
  return existingItems(pool);
}

function randomItem(size, day, randomInt, existingItems) {
  const pool = poolFor(size, day, existingItems);
  if (pool.length === 0) return null;
  return pool[randomInt(pool.length)];
}

function categoryFor(roll) {
  if (roll < 42) return "useful";
  if (roll < 67) return "rare";
  if (roll < 87) return "overpriced";
  if (roll < 92) return "fake";
  return "master_ball";
}

// Canonical v0.9.108 preparation owner for normal-event auction products.
// Catalog existence/price and deterministic RNG are injected runtime authorities;
// the category weights, depth pools, price bands, and NPC limits remain canonical here.
export function prepareAuctionData(input = {}) {
  const previous = input.data && typeof input.data === "object" ? input.data : {};
  if (Array.isArray(previous.products) && previous.products.length === 3) {
    return {
      ...previous,
      products: previous.products.map((product) => ({
        ...product,
        npc_limits:[...(product.npc_limits ?? [])],
        npc_active:[...(product.npc_active ?? [])],
      })),
    };
  }

  const day = Math.max(1, Number(input.day) || 1);
  const randomInt = input.random_int;
  const itemExists = input.item_exists;
  const itemPrice = input.item_price;
  if (typeof randomInt !== "function") throw new TypeError("random_int authority is required");
  if (typeof itemExists !== "function") throw new TypeError("item_exists authority is required");
  if (typeof itemPrice !== "function") throw new TypeError("item_price authority is required");

  const existingItems = (pool) => [...new Set(pool)].filter((id) => itemExists(id));
  const products = [];
  for (let index = 0; index < 3; index += 1) {
    const category = categoryFor(randomInt(100));
    let item;
    if (category === "useful") item = randomItem("medium", day, randomInt, existingItems);
    else if (category === "rare") item = randomItem("large", day, randomInt, existingItems);
    else if (category === "overpriced") item = randomItem("small", day, randomInt, existingItems);
    else if (category === "fake") item = randomItem("large", day, randomInt, existingItems);
    else item = itemExists("MASTERBALL") ? "MASTERBALL" : randomItem("large", day, randomInt, existingItems);
    if (!item) throw new Error(`canonical auction ${category} item pool is empty`);

    const rawBase = Number(itemPrice(item));
    const base = Math.max(Number.isFinite(rawBase) ? Math.trunc(rawBase) : 1000, 200);
    const fair = Math.max(base, 500);
    const price = Math.max(Math.floor((fair * (35 + randomInt(21))) / 100), 100);
    const npcCount = 1 + randomInt(2);
    const npcLimits = Array.from(
      { length:npcCount },
      () => Math.floor((fair * (75 + randomInt(71))) / 100),
    );
    products.push({
      category,
      item,
      fake:category === "fake",
      fair,
      price,
      npc_limits:npcLimits,
      npc_active:Array(npcCount).fill(true),
      finished:false,
    });
  }
  return { ...previous, products, won:false };
}

export const AUCTION_CANONICAL_ITEM_POOLS = Object.freeze({ LOW_ITEMS, MID_ITEMS, LARGE_ITEMS });

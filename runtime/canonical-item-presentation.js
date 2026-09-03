import { resolveCanonicalShopItemDisplay } from "./canonical-shop-item-display.js";

// Canonical v0.9.108 items reachable from non-shop presentation surfaces but
// intentionally absent from the resolved-shop projection. Keep this adapter
// presentation-only: item IDs remain the mechanics/storage authority.
const NON_SHOP_CANONICAL_NAMES = Object.freeze({
  ORANBERRY:"Oran Berry",
  PECHABERRY:"Pecha Berry",
  CHERIBERRY:"Cheri Berry",
  FRESHWATER:"Fresh Water",
  SODAPOP:"Soda Pop",
  LEMONADE:"Lemonade",
  MOOMOOMILK:"Moomoo Milk",
  NUGGET:"Nugget",
  STARDUST:"Stardust",
  RARECANDY:"Rare Candy",
  STARPIECE:"Star Piece",
  COMETSHARD:"Comet Shard",
  PPUP:"PP Up",
  ABILITYCAPSULE:"Ability Capsule",
  MASTERBALL:"Master Ball",
});

export function resolveCanonicalItemPresentation(itemId) {
  const id = String(itemId ?? "").trim();
  if (!id) throw new TypeError("canonical item id is required for presentation");

  try {
    const item = resolveCanonicalShopItemDisplay(id);
    return Object.freeze({ id:item.id, name:item.name });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
  }

  const name = NON_SHOP_CANONICAL_NAMES[id];
  if (!name) throw new RangeError(`unknown canonical item presentation id: ${id}`);
  return Object.freeze({ id, name });
}

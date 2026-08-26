// Frozen v0.9.108 item metadata projection. Data only; Bag mechanics stay in the Bag runtime.
// Tuple layout in generated shards: [keyItem, machine, berry, price].
import { MAPLESS_V108_ITEM_METADATA_SHARD_1 } from "./mapless-v108-item-metadata-1.js";
import { MAPLESS_V108_ITEM_METADATA_SHARD_2 } from "./mapless-v108-item-metadata-2.js";
import { MAPLESS_V108_ITEM_METADATA_SHARD_3 } from "./mapless-v108-item-metadata-3.js";

const ROWS = Object.freeze({
  ...MAPLESS_V108_ITEM_METADATA_SHARD_1,
  ...MAPLESS_V108_ITEM_METADATA_SHARD_2,
  ...MAPLESS_V108_ITEM_METADATA_SHARD_3,
});

export function maplessV108ItemMetadata(itemId) {
  const row = ROWS[String(itemId ?? "")];
  if (!row) return null;
  return Object.freeze({ keyItem:Boolean(row[0]), machine:Boolean(row[1]), berry:Boolean(row[2]), price:row[3] });
}

export function hasMaplessV108ItemMetadata(itemId) {
  return Object.prototype.hasOwnProperty.call(ROWS, String(itemId ?? ""));
}

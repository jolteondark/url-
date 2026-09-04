import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  pickMaplessNormalEventSmallRewards,
  resolveMaplessNormalEventSmallReward,
} from "./mapless-normal-event-small-reward.js";

export const SAFARI_SMALL_REWARD_ITEMS = MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS;

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const ITEM_META = Object.freeze(Object.fromEntries(
  SAFARI_SMALL_REWARD_ITEMS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function safariSmallRewardPockets(runtime) {
  return {
    general:{
      slots:runtime?.bag?.slots ?? [],
      maxSlots:SAFARI_BAG_MAX_SLOTS,
      maxPerSlot:SAFARI_BAG_MAX_PER_SLOT,
    },
  };
}

export function safariDeterministicSmallRewardItem(seed, salt = 0) {
  const rng = new RubyMT19937Random((Number(seed ?? 0) ^ Number(salt ?? 0)) & 0x7fffffff);
  return pickMaplessNormalEventSmallRewards({
    count:1,
    itemMeta:ITEM_META,
    randomInt:(max) => rng.randInt(max),
  }).items[0] ?? null;
}

export function preflightSafariSmallItemReward(runtime, item) {
  return resolveRewardTransaction({
    pockets:safariSmallRewardPockets(runtime),
    itemMeta:ITEM_META,
    items:[item],
  });
}

export function preflightSafariSharedSmallItemReward(runtime, randomInt, count = 1) {
  return resolveMaplessNormalEventSmallReward({
    count,
    randomInt,
    pockets:safariSmallRewardPockets(runtime),
    itemMeta:ITEM_META,
  });
}

export function applySafariSmallItemReward(runtime, reward) {
  if (!reward?.success) return [];
  const receipt = commitSafariBagEconomyReceipt(runtime, { reward });
  if (!receipt.success) throw new Error(`small item reward commit failed: ${receipt.result}`);
  return receipt.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}

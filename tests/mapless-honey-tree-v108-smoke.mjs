import assert from "node:assert/strict";
import {
  MAPLESS_HONEY_TREE_FALLBACK_BERRIES_V108,
  maplessHoneyTreeOwnedBerryEntriesV108,
  resolveHoneyTreeActionRewardV108,
} from "../runtime/mapless-honey-tree-v108.js";

assert.deepEqual(MAPLESS_HONEY_TREE_FALLBACK_BERRIES_V108, ["ORANBERRY", "SITRUSBERRY", "PECHABERRY"]);
assert.deepEqual(
  maplessHoneyTreeOwnedBerryEntriesV108([["ORANBERRY", 2], ["CHERIBERRY", 1], ["POTION", 1]])
    .map((entry) => entry.id),
  ["CHERIBERRY", "ORANBERRY"],
  "owned berries must follow canonical [price,id] order and ignore non-berries",
);

const barkEvent = { normal_seed:123, normal_data:{ bark_roll:20 } };
const barkA = resolveHoneyTreeActionRewardV108({
  event:barkEvent,
  action:"bark",
  slots:[["ORANBERRY", 2], ["CHERIBERRY", 1]],
  sharedRandomInt:() => { throw new Error("bark berry must not consume shared run RNG"); },
});
const barkB = resolveHoneyTreeActionRewardV108({
  event:barkEvent,
  action:"bark",
  slots:[["ORANBERRY", 2], ["CHERIBERRY", 1]],
  sharedRandomInt:() => { throw new Error("bark berry must not consume shared run RNG"); },
});
assert.deepEqual(barkA.selectedItems, barkB.selectedItems, "bark berry must replay from Random.new(normal_seed)");

let sharedDraws = 0;
const small = resolveHoneyTreeActionRewardV108({
  event:{ normal_seed:123, normal_data:{ bark_roll:60 } },
  action:"bark",
  slots:[],
  sharedRandomInt:(limit) => { sharedDraws += 1; return limit - 1; },
});
assert.equal(sharedDraws, 1, "bark small reward must consume exactly one shared run RNG draw");
assert.equal(small.selectedItems.length, 1);

const bug = resolveHoneyTreeActionRewardV108({
  event:{ normal_seed:123, normal_data:{} },
  action:"bug",
  slots:[],
});
assert.equal(bug.honeyCount, 2, "seed 123 must replay canonical 2 + rand(2) Honey count");
assert.deepEqual(bug.selectedItems, ["HONEY", "HONEY"]);

const original = [["HONEY", 99]];
const noRoom = resolveHoneyTreeActionRewardV108({
  event:{ normal_seed:123, normal_data:{} },
  action:"bug",
  slots:original,
});
assert.equal(noRoom.reward.success, false);
assert.equal(noRoom.reward.result, "no_room");
assert.deepEqual(noRoom.reward.pockets.general.slots, original, "Bag failure must rollback without partial Honey grant");

console.log("Honey Tree v0.9.108 reward/RNG owner smoke passed");

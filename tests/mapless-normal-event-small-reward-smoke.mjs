import assert from "node:assert/strict";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  pickMaplessNormalEventSmallRewards,
  resolveMaplessNormalEventSmallReward,
} from "../runtime/mapless-normal-event-small-reward.js";

const canonical = [
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
];
assert.deepEqual(MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, canonical);

const itemMeta = Object.fromEntries(canonical.map((item) => [item, { valid:true, pocket:"general" }]));
let calls = 0;
const picked = pickMaplessNormalEventSmallRewards({
  count:2,
  itemMeta,
  randomInt(max) {
    calls += 1;
    return calls === 1 ? 0 : max - 1;
  },
});
assert.deepEqual(picked.items, ["POTION", "SODAPOP"]);
assert.equal(calls, 2);
assert.deepEqual(
  picked.operations.map((operation) => operation.op),
  ["select_normal_event_random_item", "select_normal_event_random_item"],
);

const reward = resolveMaplessNormalEventSmallReward({
  count:2,
  itemMeta,
  randomInt:() => 0,
  pockets:{ general:{ slots:[], maxSlots:20, maxPerSlot:99 } },
});
assert.equal(reward.success, true);
assert.deepEqual(reward.granted, [{ item:"POTION", quantity:2 }]);
assert.deepEqual(reward.pockets.general.slots, [["POTION", 2]]);
assert.equal(reward.operations.filter((operation) => operation.op === "select_normal_event_random_item").length, 2);

let emptyCalls = 0;
const empty = resolveMaplessNormalEventSmallReward({
  count:1,
  itemMeta:{},
  randomInt() {
    emptyCalls += 1;
    return 0;
  },
  pockets:{ general:{ slots:[], maxSlots:20, maxPerSlot:99 } },
});
assert.equal(empty.success, false);
assert.equal(empty.result, "empty");
assert.equal(emptyCalls, 0);

console.log("mapless-normal-event-small-reward smoke: ok");

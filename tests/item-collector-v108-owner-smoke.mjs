import assert from "node:assert/strict";
import {
  MAPLESS_ITEM_COLLECTOR_BALL_GRADES_V108,
  MAPLESS_ITEM_COLLECTOR_MEDICINE_GRADES_V108,
  itemCollectorGradePoolsV108,
  itemCollectorOwnedEntriesV108,
  resolveCanonicalItemCollectorV108,
} from "../runtime/mapless-item-collector-v108.js";

assert.deepEqual(MAPLESS_ITEM_COLLECTOR_BALL_GRADES_V108, [
  ["POKEBALL", "PREMIERBALL"],
  ["GREATBALL", "HEALBALL", "NETBALL", "NESTBALL", "REPEATBALL", "DIVEBALL"],
  ["ULTRABALL", "QUICKBALL", "DUSKBALL", "TIMERBALL"],
  ["FASTBALL", "LEVELBALL", "LUREBALL", "HEAVYBALL", "LOVEBALL", "FRIENDBALL", "MOONBALL", "DREAMBALL"],
]);
assert.deepEqual(MAPLESS_ITEM_COLLECTOR_MEDICINE_GRADES_V108, [
  ["POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL"],
  ["SUPERPOTION", "FULLHEAL", "FRESHWATER", "SODAPOP"],
  ["HYPERPOTION", "LEMONADE", "MOOMOOMILK", "ETHER"],
  ["MAXPOTION", "FULLRESTORE", "MAXETHER", "ELIXIR"],
]);

const exists = (id) => id !== "PREMIERBALL" && id !== "DREAMBALL";
const quantities = new Map([["POKEBALL", 2], ["GREATBALL", 1], ["POTION", 3]]);
const quantityOf = (id) => quantities.get(id) || 0;
assert.deepEqual(itemCollectorGradePoolsV108("ball", exists)[0], ["POKEBALL"]);
assert.deepEqual(itemCollectorOwnedEntriesV108("ball", exists, quantityOf), [
  { id: "POKEBALL", qty: 2, grade: 0 },
  { id: "GREATBALL", qty: 1, grade: 1 },
]);

const base = {
  event: { normal_seed: 41, normal_resolved: false, normal_data: {} },
  choice: "ball",
  selected_item: "POKEBALL",
  item_exists: () => true,
  quantity_of: quantityOf,
};
const first = resolveCanonicalItemCollectorV108(base);
const replay = resolveCanonicalItemCollectorV108(base);
assert.deepEqual(replay, first, "same normal_seed must replay the same two action draws");
assert.equal(first.operations.filter((op) => op.op === "upgrade_roll").length, 1);
assert.equal(first.operations.filter((op) => op.op === "select_reward").length, 1);
assert.equal(first.result, true);

const noItems = resolveCanonicalItemCollectorV108({
  ...base,
  quantity_of: () => 0,
});
assert.equal(noItems.outcome, "no_exchangeable_items");
assert.equal(noItems.event.normal_resolved, false);
assert.equal(noItems.operations.some((op) => op.op === "upgrade_roll"), false,
  "action RNG must not be consumed before a selected owned item exists");

const bagFull = resolveCanonicalItemCollectorV108({ ...base, can_add_result: false });
assert.equal(bagFull.outcome, "bag_full");
assert.equal(bagFull.operations.some((op) => op.op === "remove_item"), false);

const rollback = resolveCanonicalItemCollectorV108({ ...base, grant_item_result: false });
assert.equal(rollback.outcome, "grant_failed_rolled_back");
assert.ok(rollback.operations.some((op) => op.op === "rollback_add_item" && op.item === "POKEBALL"));
assert.equal(rollback.event.normal_resolved, false);

const left = resolveCanonicalItemCollectorV108({ event: { normal_seed: 41 }, choice: "leave" });
assert.equal(left.outcome, "left");
assert.equal(left.result, true);

console.log("item collector v0.9.108 owner smoke: ok");

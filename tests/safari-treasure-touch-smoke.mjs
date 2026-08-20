import assert from "node:assert/strict";
import {
  openSafariTreasureTouch,
  prepareSafariTreasureChestV108,
  resolveSafariTreasureChest,
  safariTreasureRewardV108,
} from "../runtime/safari-treasure-chest-interaction.js";

const preparedA = prepareSafariTreasureChestV108({ kind:"treasure", type:null }, { day:14, index:4 });
const preparedB = prepareSafariTreasureChestV108({ kind:"treasure", type:null }, { day:14, index:4 });
assert.deepEqual(preparedA, preparedB, "treasure hydration must be deterministic for one generated board cell");
assert.ok(["normal","deluxe","supreme"].includes(preparedA.chest_tier));
assert.ok(Number.isInteger(preparedA.chest_seed) && preparedA.chest_seed >= 0);
const rewardA = safariTreasureRewardV108(preparedA, 14);
const rewardB = safariTreasureRewardV108(preparedA, 14);
assert.deepEqual(rewardA, rewardB, "stored chest seed must reproduce the same canonical reward");
assert.ok(rewardA.money > 0);
assert.ok(rewardA.items.length >= 1);

function makeRuntime() {
  return {
    player:{ party:[] },
    bag:{ money:1000, slots:[], max_slots:20, max_per_slot:99 },
    variables:{ mapless:{
      day:14, location:"day_board", battle:null, shop:null,
      board_events:[{kind:"next_day"},{kind:"wild"},{kind:"normal_event"},{kind:"egg_shop"},{kind:"treasure"},{kind:"shop"},{kind:"trainer"},{kind:"type_event"}],
      board_revealed:Array(8).fill(false), board_visited:Array(8).fill(false), board_consumed:Array(8).fill(false), last_operations:[], notice:"",
    } },
  };
}

const originalDocument = globalThis.document;
globalThis.document = {};
try {
  const runtime = makeRuntime();
  const ready = openSafariTreasureTouch(runtime, 4);
  assert.equal(ready.result, "treasure_ready");
  assert.deepEqual(ready.availableActions, ["open","leave"]);
  assert.equal(runtime.variables.mapless.board_visited[4], true);
  assert.equal(runtime.variables.mapless.board_consumed[4], false);
  assert.equal(globalThis.__maplessNormalEventUi.eventId, "treasure_chest");
  assert.deepEqual(globalThis.__maplessNormalEventUi.actions.map((action) => action.id), ["open","leave"]);

  const beforeMoney = runtime.bag.money;
  const granted = resolveSafariTreasureChest(runtime, 4, "open");
  assert.equal(granted.result, "granted");
  assert.equal(granted.completed, true);
  assert.equal(granted.consumed, true);
  assert.equal(runtime.variables.mapless.board_consumed[4], true);
  assert.equal(runtime.bag.money, beforeMoney + granted.reward.money);
  assert.ok(runtime.bag.slots.length > 0);
  assert.equal(granted.persistenceRequested, true);
  assert.equal(granted.operations.some((operation) => operation.op === "request_save"), true);

  const leaveRuntime = makeRuntime();
  openSafariTreasureTouch(leaveRuntime, 4);
  const declined = resolveSafariTreasureChest(leaveRuntime, 4, "leave");
  assert.equal(declined.completed, true, "leaving closes the touch scene");
  assert.equal(declined.consumed, false, "leaving must keep canonical treasure available for revisit");
  assert.equal(leaveRuntime.variables.mapless.board_consumed[4], false);
} finally {
  globalThis.__maplessNormalEventUi = null;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}

console.log("Safari treasure touch owner smoke: PASS");

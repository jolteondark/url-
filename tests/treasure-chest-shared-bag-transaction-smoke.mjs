import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveSafariTreasureChest } from "../runtime/safari-treasure-chest-interaction.js";

const source = await readFile(new URL("../runtime/safari-treasure-chest-interaction.js", import.meta.url), "utf8");
assert.match(source, /resolveRewardTransaction/);
assert.doesNotMatch(source, /from \"\.\/bag-economy-mart-flow\.js\"/);
assert.doesNotMatch(source, /function canGrantBag/);
assert.match(source, /rewardAttempt\.operations/);

function runtime(maxSlots) {
  return {
    variables:{ mapless:{
      day:1,
      board_events:[{ kind:"treasure", chest_tier:"normal", chest_seed:12345, chest_generated_day:1 }],
      board_consumed:[false],
      board_revealed:[false],
      board_visited:[false],
    } },
    bag:{ slots:[], money:100, max_slots:maxSlots, max_per_slot:99 },
  };
}

const blocked = runtime(0);
const blockedResult = resolveSafariTreasureChest(blocked, 0, "open");
assert.equal(blockedResult.result, "no_room");
assert.equal(blockedResult.consumed, false);
assert.equal(blocked.variables.mapless.board_consumed[0], false);
assert.equal(blocked.bag.money, 100);
assert.equal(blocked.bag.slots.length, 0);
assert.ok(blockedResult.operations.some((operation) => operation.op === "preflight_can_add" && operation.result === false));

const success = runtime(20);
const successResult = resolveSafariTreasureChest(success, 0, "open");
assert.equal(successResult.result, "granted");
assert.equal(successResult.consumed, true);
assert.equal(successResult.persistenceRequested, true);
assert.equal(success.variables.mapless.board_consumed[0], true);
assert.ok(success.bag.money > 100);
assert.ok(success.bag.slots.length > 0);
assert.ok(successResult.operations.some((operation) => operation.op === "bag_add_all" && operation.result === true));
assert.equal(successResult.operations.at(-1)?.op, "request_save");

console.log("treasure chest uses shared atomic Bag reward transaction");

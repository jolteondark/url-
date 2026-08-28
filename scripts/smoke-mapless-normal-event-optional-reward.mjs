import assert from "node:assert/strict";
import { projectMaplessNormalEventOptionalReward } from "../runtime/mapless-normal-event-optional-reward.js";

const finished = { result:true, event:{ normal_resolved:true } };
const granted = projectMaplessNormalEventOptionalReward({
  ownerResult:finished,
  rewardResult:{ success:true, operations:[{op:"grant_item"}] },
});
assert.equal(granted.completed, true);
assert.equal(granted.rewardGranted, true);
assert.equal(granted.rewardSkipped, false);

const bagFull = projectMaplessNormalEventOptionalReward({
  ownerResult:finished,
  rewardResult:{ success:false, reason:"no_room", operations:[{op:"reward_failed"}] },
});
assert.equal(bagFull.completed, true);
assert.equal(bagFull.rewardGranted, false);
assert.equal(bagFull.rewardSkipped, true);
assert.equal(bagFull.rewardReason, "no_room");
assert.deepEqual(bagFull.rewardOperations, [{op:"reward_failed"}]);

assert.throws(() => projectMaplessNormalEventOptionalReward({
  ownerResult:{ result:false, event:{ normal_resolved:false } },
  rewardResult:{ success:false, reason:"no_room" },
}), /completed canonical event/);

console.log("smoke-mapless-normal-event-optional-reward: ok");

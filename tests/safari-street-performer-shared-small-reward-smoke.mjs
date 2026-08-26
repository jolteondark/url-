import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SAFARI_SMALL_REWARD_ITEMS,
  preflightSafariSharedSmallItemReward,
} from "../runtime/safari-small-item-reward.js";

const source = fs.readFileSync(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");
assert.match(source, /borrowSafariSharedRunRandomInt/);
assert.match(source, /ensureSafariEncounterSeed/);
assert.match(source, /preflightSafariSharedSmallItemReward/);
assert.match(source, /preview_encounter_counter = counter/);
assert.doesNotMatch(source, /STREET_REWARD_SALT/);
assert.doesNotMatch(source, /safariDeterministicSmallRewardItem/);

let draws = 0;
const runtime = { bag:{ slots:[], money:0 } };
const reward = preflightSafariSharedSmallItemReward(runtime, (limit) => {
  draws += 1;
  assert.equal(limit, SAFARI_SMALL_REWARD_ITEMS.length);
  return limit - 1;
});
assert.equal(draws, 1, "same-type performance reward must consume exactly one shared small-reward draw");
assert.equal(reward.success, true);
assert.deepEqual(reward.selectedItems, [SAFARI_SMALL_REWARD_ITEMS.at(-1)]);

const fullRuntime = {
  bag:{ slots:Array.from({ length:20 }, (_, index) => [`BLOCK${index}`, 99]), money:0 },
};
let fullDraws = 0;
const blocked = preflightSafariSharedSmallItemReward(fullRuntime, (limit) => {
  fullDraws += 1;
  return 0;
});
assert.equal(fullDraws, 1, "Bag preflight still projects the canonical one-draw reward before caller rollback");
assert.equal(blocked.success, false);
assert.deepEqual(fullRuntime.bag.slots, Array.from({ length:20 }, (_, index) => [`BLOCK${index}`, 99]));

console.log("Safari Street Performer shared small-reward smoke passed");

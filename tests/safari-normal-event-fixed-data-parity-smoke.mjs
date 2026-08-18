import assert from "node:assert/strict";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";

function prepared(id, day = 7) {
  return prepareSafariNormalEventV108({
    kind: "normal_event",
    normal_event_id: id,
    normal_seed: 12345,
    normal_data: {},
  }, { day, index: 0 });
}

const expected = {
  street_performer: { fraud_roll: 98 },
  lost_bag: { trap: true, wait_roll: 29 },
  wishing_fountain: { small_roll: 98, large_roll: 29, reach_roll: 1, bonus_stat: "SPECIAL_DEFENSE" },
  trainer_camp: { task: "watch", manual_fail: false },
  berry_contest: { rating_roll: -8, bulk_roll: 29 },
  bounty_poster: { trainer_seed: 1845187042, type: "ICE", appearance: "傷だらけの女剣士", reward: 3550 },
  crumbling_bridge: { careful_roll: 98, reward_kind: "rescue" },
};

for (const [id, fixed] of Object.entries(expected)) {
  const event = prepared(id);
  assert.equal(event.normal_seed, 12345, `${id}: canonical normal_seed must stay stable`);
  for (const [key, value] of Object.entries(fixed)) {
    assert.deepEqual(event.normal_data[key], value, `${id}.${key}`);
  }
  const hydratedAgain = prepareSafariNormalEventV108(event, { day: 7, index: 0 });
  assert.deepEqual(hydratedAgain.normal_data, event.normal_data, `${id}: hydration must be stable`);
}

console.log("Safari canonical v0.9.108 normal-event fixed-data Ruby MT parity: ok");

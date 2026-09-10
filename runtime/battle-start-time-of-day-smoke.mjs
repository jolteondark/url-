import assert from "node:assert/strict";
import {
  commitBattleStartTimeOfDayCanonical,
  resolveCanonicalBattleStartTimeOfDay,
} from "./battle-start-time-of-day.js";

const localTime = (hour, minute) => new Date(2026, 8, 10, hour, minute, 0, 0);

for (const [hour, minute, expected] of [
  [4, 59, "NIGHT"],
  [5, 0, "DAY"],
  [16, 59, "DAY"],
  [17, 0, "EVE"],
  [19, 59, "EVE"],
  [20, 0, "NIGHT"],
]) {
  assert.equal(resolveCanonicalBattleStartTimeOfDay(localTime(hour, minute)), expected, `${hour}:${minute}`);
}

const battle = {};
assert.deepEqual(
  commitBattleStartTimeOfDayCanonical({ battle, now: localTime(4, 59) }),
  { committed: true, reason: "committed", timeOfDay: "NIGHT" },
);
assert.deepEqual(
  commitBattleStartTimeOfDayCanonical({ battle, now: localTime(12, 0) }),
  { committed: false, reason: "already_committed", timeOfDay: "NIGHT" },
);
assert.equal(battle.timeOfDay, "NIGHT", "Battle-start owner period must stay stable after wall-clock change");
assert.throws(
  () => commitBattleStartTimeOfDayCanonical({ battle: { timeOfDay: "day" }, now: localTime(12, 0) }),
  /invalid existing Battle timeOfDay owner value/,
);

console.log("battle-start-time-of-day smoke: ok");

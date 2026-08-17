import assert from "node:assert/strict";
import { MAPLESS_BOUNDARY_LEADER_ORDER_V108, maplessBoundaryLeaderNameV108 } from "../runtime/mapless-boundary-trial-leader-data-v108.js";
import { ensurePendingBoundaryLeaderV108, refillBoundaryLeaderBagV108 } from "../runtime/mapless-boundary-trial-leader-bag-v108.js";

assert.deepEqual(MAPLESS_BOUNDARY_LEADER_ORDER_V108, ["BROCK","MISTY","SURGE","ERIKA","KOGA","SABRINA","BLAINE","GREEN"]);
assert.equal(maplessBoundaryLeaderNameV108("GREEN"), "グリーン");
assert.ok(!MAPLESS_BOUNDARY_LEADER_ORDER_V108.includes("GIOVANNI"));

const zeros = () => 0;
const bag = refillBoundaryLeaderBagV108({ randomBelow: zeros });
assert.equal(bag.length, 8);
assert.equal(new Set(bag).size, 8);

const protectedBag = refillBoundaryLeaderBagV108({ lastLeader: bag[0], randomBelow: zeros });
assert.notEqual(protectedBag[0], bag[0]);

const selected = ensurePendingBoundaryLeaderV108({ leaderBag: ["MISTY","BROCK"], randomBelow: zeros });
assert.equal(selected.pendingLeader, "MISTY");
assert.deepEqual(selected.leaderBag, ["BROCK"]);

const persisted = ensurePendingBoundaryLeaderV108({ leaderBag: ["BROCK"], pendingLeader: "MISTY", randomBelow: zeros });
assert.equal(persisted.pendingLeader, "MISTY");
assert.deepEqual(persisted.leaderBag, ["BROCK"]);

console.log("Safari boundary leader bag smoke: ok");

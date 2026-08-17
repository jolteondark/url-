import assert from "node:assert/strict";
import { MAPLESS_BOUNDARY_PARTY3_V108 } from "../runtime/mapless-boundary-trial-party3-v108.js";
import { MAPLESS_BOUNDARY_LEADER_ORDER_V108 } from "../runtime/mapless-boundary-trial-leader-data-v108.js";

assert.deepEqual(Object.keys(MAPLESS_BOUNDARY_PARTY3_V108), MAPLESS_BOUNDARY_LEADER_ORDER_V108);
let memberCount = 0;
for (const leader of MAPLESS_BOUNDARY_LEADER_ORDER_V108) {
  const definition = MAPLESS_BOUNDARY_PARTY3_V108[leader];
  assert.equal(definition.members.length, 3, `${leader} party size`);
  assert.equal(definition.members.filter((member) => member.ace).length, 1, `${leader} ace count`);
  assert.equal(definition.members[2].ace, true, `${leader} ace slot`);
  for (const member of definition.members) {
    assert.equal(member.moves.length, 4, `${leader}/${member.species} move count`);
    assert.equal(typeof member.ability, "string");
    memberCount += 1;
  }
}
assert.equal(memberCount, 24);
assert.deepEqual(MAPLESS_BOUNDARY_PARTY3_V108.BROCK.members[0].moves, ["ROCKTOMB","BULLDOZE","DEFENSECURL","STEALTHROCK"]);
assert.equal(MAPLESS_BOUNDARY_PARTY3_V108.GREEN.members[2].species, "PIDGEOTTO");
assert.equal(MAPLESS_BOUNDARY_PARTY3_V108.GREEN.members[2].item, "SHARPBEAK");
console.log("Safari boundary party-3 data smoke: ok");

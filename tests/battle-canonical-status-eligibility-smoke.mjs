import assert from "node:assert/strict";
import { CAN_INFLICT_STATUS_SOURCE_V108, canInflictMajorStatusCanonical } from "../runtime/battle-core-status-eligibility.js";

assert.equal(CAN_INFLICT_STATUS_SOURCE_V108.sourceSectionSha256, "a063652e8465748be772da9798eb36c689621cbda2de0d509cee0023220befb9");
assert.equal(CAN_INFLICT_STATUS_SOURCE_V108.sourceSliceSha256, "3e233a8ca79022e94c5faeebcd2a163889c7d45fb6fc9e66e61598d7c740c22c");

const allowed = canInflictMajorStatusCanonical({ newStatus: "PARALYSIS", currentStatus: "NONE", targetTypes: ["NORMAL"] });
assert.equal(allowed.canInflict, true);
assert.equal(allowed.reason, "allowed");

assert.equal(canInflictMajorStatusCanonical({ newStatus: "PARALYSIS", targetTypes: ["ELECTRIC"] }).reason, "type_immunity");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "POISON", targetTypes: ["STEEL"] }).reason, "type_immunity");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "POISON", targetTypes: ["STEEL"], userCorrosion: true }).canInflict, true);
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", targetTypes: ["FIRE"] }).reason, "type_immunity");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "FROZEN", targetTypes: ["ICE"] }).reason, "type_immunity");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "FROZEN", effectiveWeather: "Sun" }).reason, "sun_prevents_freeze");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "SLEEP", affectedByTerrain: true, terrain: "Electric" }).reason, "electric_terrain_prevents_sleep");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", affectedByTerrain: true, terrain: "Misty" }).reason, "misty_terrain_prevents_status");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "SLEEP", uproarActive: true }).reason, "uproar_prevents_sleep");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "SLEEP", uproarActive: true, soundproofActive: true }).canInflict, true);
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", currentStatus: "POISON" }).reason, "other_major_status");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", substituteHp: 1 }).reason, "substitute");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", safeguardTurns: 3 }).reason, "safeguard");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", safeguardTurns: 3, userInfiltrator: true }).canInflict, true);
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", statusImmunityNonIgnorable: true, moldBreaker: true }).reason, "ability_immunity_non_ignorable");
assert.equal(canInflictMajorStatusCanonical({ newStatus: "BURN", statusImmunityAbility: true, moldBreaker: true }).canInflict, true);

console.log("Battle canonical major-status eligibility owner: ok");

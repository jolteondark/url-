import assert from "node:assert/strict";

globalThis.window = {};
globalThis.__maplessGeneralCombatTrace = [];

const demand = await import("../runtime/safari-general-data-demand.js?concurrent-demand-trace-smoke=1");

await Promise.all([
  demand.ensureSafariGeneralCombatData("wild"),
  demand.ensureSafariGeneralCombatData("wild"),
]);

const joinedTrace = globalThis.__maplessGeneralCombatTrace;
const starts = joinedTrace.filter((entry) => entry.stage === "combat_demand_start");
assert.equal(starts.length, 2, "both joined combat demands should remain visible in one trace");
assert.equal(starts[0].joined_existing_demand, false, "the first demand should own a fresh trace");
assert.equal(starts[1].joined_existing_demand, true, "the concurrent demand should join without clearing the owner trace");
assert.equal(joinedTrace.filter((entry) => entry.stage === "general_data_import_start").length, 1, "concurrent demand must not duplicate GENERAL loader import");
assert.equal(joinedTrace.filter((entry) => entry.stage === "general_data_import_join").length, 1, "concurrent demand should join the in-flight GENERAL loader");
assert.ok(joinedTrace.some((entry) => entry.stage === "general_loader_projection_validated"), "chunk/decode/projection stages from the owner demand must survive the join");
assert.equal(joinedTrace.filter((entry) => entry.stage === "wild_module_import_start").length, 1, "concurrent wild demand must share one runtime import");
assert.equal(joinedTrace.filter((entry) => entry.stage === "combat_demand_ready").length, 2, "both callers should observe the shared demand completing");

await demand.ensureSafariGeneralCombatData("wild");
const freshTrace = globalThis.__maplessGeneralCombatTrace;
assert.equal(freshTrace.filter((entry) => entry.stage === "combat_demand_start").length, 1, "a later warm demand should begin a fresh trace");
assert.equal(freshTrace[0].joined_existing_demand, false, "resolved Promise caches must not make a later demand look in-flight");
assert.ok(freshTrace.some((entry) => entry.stage === "general_masters_already_ready"));
assert.equal(freshTrace.some((entry) => entry.stage === "general_data_import_join"), false);

console.log("Safari GENERAL concurrent-demand trace smoke PASS");

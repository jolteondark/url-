import assert from "node:assert/strict";

globalThis.window = {};
globalThis.__maplessGeneralCombatTrace = [];

const demand = await import("../runtime/safari-general-data-demand.js?cross-kind-concurrent-demand-smoke=1");

await Promise.all([
  demand.ensureSafariGeneralCombatData("wild"),
  demand.ensureSafariGeneralCombatData("trainer"),
]);

const trace = globalThis.__maplessGeneralCombatTrace;
const starts = trace.filter((entry) => entry.stage === "combat_demand_start");
assert.equal(starts.length, 2, "wild and trainer concurrent demands must remain visible in one trace");
assert.equal(starts[0].kind, "wild");
assert.equal(starts[0].joined_existing_demand, false, "the first selected demand must own the fresh trace");
assert.equal(starts[1].kind, "trainer");
assert.equal(starts[1].joined_existing_demand, true, "the second selected demand must join without clearing the owner trace");
assert.equal(trace.filter((entry) => entry.stage === "general_data_import_start").length, 1,
  "cross-kind concurrent demand must share one GENERAL loader import");
assert.equal(trace.filter((entry) => entry.stage === "general_data_import_join").length, 1,
  "cross-kind concurrent demand must join the in-flight GENERAL loader");
assert.ok(trace.some((entry) => entry.stage === "general_loader_projection_validated"),
  "loader chunk/decode/projection trace must survive a cross-kind join");
assert.equal(trace.filter((entry) => entry.stage === "wild_module_import_start").length, 1,
  "wild selected owner must import exactly once");
assert.equal(trace.filter((entry) => entry.stage === "trainer_module_import_start").length, 1,
  "trainer selected owner must import exactly once");
assert.equal(trace.filter((entry) => entry.stage === "wild_module_import_ready").length, 1);
assert.equal(trace.filter((entry) => entry.stage === "trainer_module_import_ready").length, 1);
assert.equal(trace.filter((entry) => entry.stage === "combat_demand_ready").length, 2,
  "both selected callers must complete through the shared canonical master demand");
assert.equal(demand.safariGeneralCombatReady("both"), true);

const { encounterRuntime, trainerGenerator } = demand.safariGeneralCombatModules("both");
const wild = encounterRuntime.resolveSafariGeneralEncounter({
  day: 1,
  requiredType: "NORMAL",
  enemyRank: "NORMAL",
  speciesRoll: 0,
  varianceRoll: 0.5,
});
assert.ok(wild.species_id);
assert.ok(wild.move_ids.length > 0 && wild.move_ids.length <= 4);

const trainer = trainerGenerator.generateSafariDynamicTrainer({ day: 1, partySize: 3, seed: 12345 });
assert.equal(trainer.party.length, 3);
for (const member of trainer.party) {
  assert.ok(member.species);
  assert.ok(member.move_ids.length > 0 && member.move_ids.length <= 4);
}

const { safariGeneralMaterializedMasterCounts } = await import("../runtime/safari-general-encounter-data-loader.js");
const materialized = safariGeneralMaterializedMasterCounts();
assert.ok(materialized.species <= 4,
  `one wild plus one three-member trainer must materialize at most four species, got ${materialized.species}`);
assert.ok(materialized.moves <= 16,
  `one wild plus one three-member trainer must materialize at most sixteen reset moves, got ${materialized.moves}`);

await demand.ensureSafariGeneralCombatData("wild");
const warmTrace = globalThis.__maplessGeneralCombatTrace;
assert.equal(warmTrace.filter((entry) => entry.stage === "combat_demand_start").length, 1,
  "a later warm selected demand must start a fresh trace");
assert.equal(warmTrace[0].joined_existing_demand, false,
  "resolved cross-kind promises must not remain classified as in-flight");
assert.ok(warmTrace.some((entry) => entry.stage === "general_masters_already_ready"));
assert.equal(warmTrace.some((entry) => entry.stage === "general_data_import_join"), false);

console.log("Safari GENERAL cross-kind concurrent demand smoke PASS");

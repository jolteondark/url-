import assert from "node:assert/strict";

globalThis.window = {};
globalThis.__maplessGeneralCombatTrace = [];

const demand = await import("../runtime/safari-general-data-demand.js?concurrent-demand-trace-smoke=1");

await Promise.all([
  demand.ensureSafariGeneralCombatData("wild"),
  demand.ensureSafariGeneralCombatData("wild"),
  demand.ensureSafariGeneralCombatData("trainer"),
]);

const joinedTrace = globalThis.__maplessGeneralCombatTrace;
const starts = joinedTrace.filter((entry) => entry.stage === "combat_demand_start");
assert.equal(starts.length, 3, "same-kind and cross-kind joined combat demands should remain visible in one trace");
assert.equal(starts[0].kind, "wild");
assert.equal(starts[0].joined_existing_demand, false, "the first demand should own a fresh trace");
assert.equal(starts[1].kind, "wild");
assert.equal(starts[1].joined_existing_demand, true, "the concurrent same-kind demand should join without clearing the owner trace");
assert.equal(starts[2].kind, "trainer");
assert.equal(starts[2].joined_existing_demand, true, "the concurrent cross-kind demand should join without clearing the owner trace");
assert.equal(joinedTrace.filter((entry) => entry.stage === "general_data_import_start").length, 1, "concurrent selected demands must not duplicate GENERAL loader import");
assert.equal(joinedTrace.filter((entry) => entry.stage === "general_data_import_join").length, 2, "both later selected demands should join the in-flight GENERAL loader");
assert.ok(joinedTrace.some((entry) => entry.stage === "general_loader_projection_validated"), "chunk/decode/projection stages from the owner demand must survive same-kind and cross-kind joins");
assert.equal(joinedTrace.filter((entry) => entry.stage === "wild_module_import_start").length, 1, "concurrent wild demands must share one runtime import");
assert.equal(joinedTrace.filter((entry) => entry.stage === "trainer_module_import_start").length, 1, "the concurrent trainer demand must import only its selected runtime");
assert.equal(joinedTrace.filter((entry) => entry.stage === "wild_module_import_ready").length, 1);
assert.equal(joinedTrace.filter((entry) => entry.stage === "trainer_module_import_ready").length, 1);
assert.equal(joinedTrace.filter((entry) => entry.stage === "combat_demand_ready").length, 3, "all callers should observe the shared canonical master demand completing");
assert.equal(demand.safariGeneralCombatReady("both"), true, "cross-kind join should leave both selected combat owners ready");

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
const freshTrace = globalThis.__maplessGeneralCombatTrace;
assert.equal(freshTrace.filter((entry) => entry.stage === "combat_demand_start").length, 1, "a later warm demand should begin a fresh trace");
assert.equal(freshTrace[0].joined_existing_demand, false, "resolved Promise caches must not make a later demand look in-flight");
assert.ok(freshTrace.some((entry) => entry.stage === "general_masters_already_ready"));
assert.equal(freshTrace.some((entry) => entry.stage === "general_data_import_join"), false);

console.log("Safari GENERAL concurrent-demand trace smoke PASS");

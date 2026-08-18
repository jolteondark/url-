import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const wildSource = await readFile(new URL("../runtime/safari-general-encounter-runtime.js", import.meta.url), "utf8");
const trainerSource = await readFile(new URL("../runtime/mapless-dynamic-trainer-generator.js", import.meta.url), "utf8");
const sharedSource = await readFile(new URL("../runtime/safari-playable-data.js", import.meta.url), "utf8");

for (const [label, source] of [["wild", wildSource], ["trainer", trainerSource]]) {
  assert.equal(
    source.includes("safari-general-encounter-data-loader.js"),
    false,
    `${label} selected-demand module must not statically re-import the GENERAL loader`,
  );
  assert.ok(
    source.includes('from "./safari-playable-data.js"'),
    `${label} selected-demand module must consume the installed shared master owner`,
  );
  assert.ok(source.includes("safariCanonicalResetMoves"));
  assert.ok(source.includes("SAFARI_SPECIES_MASTERS"));
  assert.ok(source.includes("SAFARI_MOVE_MASTERS"));
}

assert.ok(
  sharedSource.includes("export function safariCanonicalResetMoves"),
  "canonical reset-moves lookup must live on the shared installed-master owner",
);
assert.ok(
  sharedSource.includes('if (!generalInstalled) throw new Error("Safari GENERAL masters are not installed")'),
  "selected reset-moves lookup must fail closed before canonical GENERAL masters are installed",
);

// Browser retry contract: the demand owner is the only production module that
// imports the retry-generation loader URL. Wild/trainer modules must remain
// downstream consumers of the already-installed shared lazy masters so a
// failed bare loader module-map entry cannot poison their retry import graph.
const demandSource = await readFile(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
assert.ok(demandSource.includes("safariGeneralLoaderSpecifier"));
assert.ok(demandSource.includes("safariGeneralCombatModuleSpecifier"));

// Browser-like master-install contract: selected wild/trainer modules may be
// evaluated before GENERAL masters exist (for example after a prior module
// fetch succeeds but the combat demand has not installed its projection yet).
// Their function call must fail closed without introducing fallback data, then
// the same module instances must become usable after the canonical demand owner
// installs the shared lazy masters in the same page/session.
globalThis.window = {};
globalThis.__maplessGeneralCombatTrace = [];

const wildRuntime = await import("../runtime/safari-general-encounter-runtime.js?shared-master-retry-smoke=1");
const trainerRuntime = await import("../runtime/mapless-dynamic-trainer-generator.js?shared-master-retry-smoke=1");

assert.throws(
  () => wildRuntime.resolveSafariGeneralEncounter({
    day: 1,
    requiredType: "NORMAL",
    enemyRank: "NORMAL",
    speciesRoll: 0,
    varianceRoll: 0.5,
  }),
  /Safari GENERAL masters are not installed|missing Safari General species master/,
  "selected wild resolution must fail closed before GENERAL master installation",
);
assert.throws(
  () => trainerRuntime.generateSafariDynamicTrainer({ day: 1, partySize: 1, seed: 12345 }),
  /Safari GENERAL masters are not installed/,
  "selected trainer generation must fail closed before GENERAL master installation",
);

const demand = await import("../runtime/safari-general-data-demand.js?shared-master-retry-smoke=1");
await demand.ensureSafariGeneralCombatData("wild");
assert.equal(demand.safariGeneralCombatReady("wild"), true);
assert.equal(demand.safariGeneralCombatReady("trainer"), false,
  "recovering a wild demand must not eagerly import the trainer generator");

const recoveredWild = wildRuntime.resolveSafariGeneralEncounter({
  day: 1,
  requiredType: "NORMAL",
  enemyRank: "NORMAL",
  speciesRoll: 0,
  varianceRoll: 0.5,
});
assert.ok(recoveredWild.species_id);
assert.ok(recoveredWild.move_ids.length > 0 && recoveredWild.move_ids.length <= 4);

await demand.ensureSafariGeneralCombatData("trainer");
assert.equal(demand.safariGeneralCombatReady("trainer"), true);
const recoveredTrainer = trainerRuntime.generateSafariDynamicTrainer({ day: 1, partySize: 1, seed: 12345 });
assert.equal(recoveredTrainer.party.length, 1);
assert.ok(recoveredTrainer.party[0].move_ids.length > 0 && recoveredTrainer.party[0].move_ids.length <= 4);

const { safariGeneralMaterializedMasterCounts } = await import("../runtime/safari-general-encounter-data-loader.js");
const materialized = safariGeneralMaterializedMasterCounts();
assert.ok(materialized.species <= 2,
  `same-session recovery must materialize only selected species, got ${materialized.species}`);
assert.ok(materialized.moves <= 8,
  `same-session recovery must materialize only selected reset moves, got ${materialized.moves}`);
assert.equal(globalThis.__maplessLastError ?? null, null,
  "successful same-session recovery must not leave a stale runtime error");
assert.equal(sharedSource.includes("fallback"), false,
  "shared GENERAL owner must not introduce fallback canonical data");

console.log("Safari GENERAL retry shared-master owner smoke PASS");
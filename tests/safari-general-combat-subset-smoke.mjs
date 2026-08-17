import assert from "node:assert/strict";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  safariGeneralMastersInstalled,
} from "../runtime/safari-playable-data.js";
import {
  ensureSafariGeneralCombatData,
  safariGeneralCombatModules,
  safariGeneralCombatReady,
} from "../runtime/safari-general-data-demand.js";
import { safariGeneralMaterializedMasterCounts } from "../runtime/safari-general-encounter-data-loader.js";

assert.equal(safariGeneralMastersInstalled(), false, "combat bootstrap must not mark the full GENERAL projection installed");
await ensureSafariGeneralCombatData();
assert.equal(safariGeneralCombatReady(), true);
assert.equal(safariGeneralMastersInstalled(), false, "loading combat modules must not force full GENERAL install");

const { encounterRuntime, trainerGenerator } = safariGeneralCombatModules();
const wild = encounterRuntime.resolveSafariGeneralEncounter({
  day: 1,
  requiredType: "BUG",
  enemyRank: "NORMAL",
  speciesRoll: 0,
  varianceRoll: 0.5,
});
assert.ok(SAFARI_SPECIES_MASTERS[wild.species_id], "selected wild species must be installed into the shared Safari masters");
for (const id of wild.move_ids) assert.ok(SAFARI_MOVE_MASTERS[id], `selected wild move ${id} must be installed`);
assert.equal(safariGeneralMastersInstalled(), false);

const trainer = trainerGenerator.generateSafariDynamicTrainer({ day: 1, seed: 12345 });
for (const pokemon of trainer.party) {
  assert.ok(SAFARI_SPECIES_MASTERS[pokemon.species], `trainer species ${pokemon.species} must be installed`);
  for (const id of pokemon.move_ids) assert.ok(SAFARI_MOVE_MASTERS[id], `trainer move ${id} must be installed`);
}
assert.equal(safariGeneralMastersInstalled(), false, "a generated trainer party must still use the subset path");
const counts = safariGeneralMaterializedMasterCounts();
assert.ok(counts.species < 20, `combat subset unexpectedly materialized ${counts.species} species`);
assert.ok(counts.moves < 80, `combat subset unexpectedly materialized ${counts.moves} moves`);

console.log("Safari GENERAL combat subset loading: ok");

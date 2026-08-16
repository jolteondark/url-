import assert from "node:assert/strict";
import { resolveGeneralWildEncounter } from "../runtime/general-wild-encounter-resolver.js";
import { buildGeneralEncounterSpeciesPool } from "../runtime/general-encounter-species-pools.js";
import { createSafariPlayableRuntime, activateSafariDayBoardCell } from "../runtime/safari-playable-integration-core.js";

const low = resolveGeneralWildEncounter({
  day: 1,
  requiredType: "ELECTRIC",
  enemyRank: "NORMAL",
  extraModifier: 0,
  speciesRoll: 0,
  varianceRoll: 0,
});
assert.equal(low.schema, "mapless.general-wild-encounter.v1");
assert.equal(low.scaling.baseLevel, 3);
assert.equal(low.levelVariance, -1);
assert.equal(low.level, 2);
const lowPool = buildGeneralEncounterSpeciesPool("ELECTRIC", low.scaling.allowedStages);
assert.equal(low.speciesId, lowPool[0]);
assert.equal(low.poolSize, lowPool.length);

const high = resolveGeneralWildEncounter({
  day: 61,
  requiredType: "DRAGON",
  enemyRank: "STRONG",
  extraModifier: 1,
  speciesRoll: 0.999999,
  varianceRoll: 0.999999,
});
const highPool = buildGeneralEncounterSpeciesPool("DRAGON", high.scaling.allowedStages);
assert.equal(high.speciesId, highPool.at(-1));
assert.equal(high.levelVariance, 1);
assert.equal(high.level, high.scaling.baseLevel + 1);

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.preview_encounter_seed = 0x12345678;
state.preview_encounter_counter = 0;
const wildIndex = state.board_events.findIndex((event) => event.kind === "wild");
assert.notEqual(wildIndex, -1);
const expectedType = state.board_events[wildIndex].type;
const result = activateSafariDayBoardCell(runtime, wildIndex);
assert.equal(result.result, "dispatched");
assert.equal(state.battle.kind, "wild");
assert.equal(state.battle.encounter.required_type, expectedType);
assert.equal(state.battle.general_selection.owner_schema, "mapless.general-wild-encounter.v1");
assert.ok([0, 1, 2].includes(state.battle.general_selection.variance_index));
assert.ok(state.battle.encounter.level >= 1 && state.battle.encounter.level <= 100);
assert.equal(state.battle.foe.species, state.battle.encounter.species_id);
assert.ok(Array.isArray(state.battle.foe.moves) && state.battle.foe.moves.length >= 1 && state.battle.foe.moves.length <= 4);
assert.equal(state.preview_encounter_counter, 2);

console.log("PASS canonical General wild owner: species pool + independent variance + playable battle");

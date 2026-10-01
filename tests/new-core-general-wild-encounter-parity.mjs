import assert from 'node:assert/strict';
import { buildGeneralEncounterSpeciesPool } from '../runtime/general-encounter-species-pools.js';
import { resolveGeneralTypeEncounterRuntime } from '../runtime/general-type-encounter-runtime.js';
import {
  GENERAL_ENCOUNTER_RULES,
  generalWildEncounterPlan,
} from '../src-next/core/encounters/general-wild.js';

for (const input of [
  { day: 1, type: 'BUG', speciesIndex: 0, varianceIndex: 0 },
  { day: 5, type: 'ELECTRIC', speciesIndex: 3, varianceIndex: 1 },
  { day: 40, type: 'WATER', speciesIndex: 7, varianceIndex: 2 },
  { day: 100, type: 'NORMAL', speciesIndex: 2, varianceIndex: 0 },
]) {
  const dayScaling = Math.floor((input.day - 1) / GENERAL_ENCOUNTER_RULES.dayInterval);
  const baseLevel = Math.max(1, Math.min(100, 3 + dayScaling * 2));
  const band = GENERAL_ENCOUNTER_RULES.stageBands.find((entry) => baseLevel >= entry.minLevel && baseLevel <= entry.maxLevel);
  const pool = buildGeneralEncounterSpeciesPool(input.type, [...band.stages]);
  const speciesIndex = input.speciesIndex % pool.length;
  const next = generalWildEncounterPlan({
    day: input.day,
    requiredType: input.type,
    speciesPool: pool,
    speciesIndex,
    varianceIndex: input.varianceIndex,
  });
  const legacy = resolveGeneralTypeEncounterRuntime({
    day: input.day,
    requiredType: input.type,
    enemyRank: 'NORMAL',
    extraModifier: 0,
    speciesIndex,
    varianceIndex: input.varianceIndex,
    useVariance: true,
  });
  assert.equal(next.speciesId, legacy.species_id);
  assert.equal(next.baseLevel, legacy.base_level);
  assert.equal(next.variance, legacy.variance);
  assert.equal(next.level, legacy.level);
  assert.deepEqual([...next.allowedStages], legacy.selection.allowed_stages);
  assert.equal(next.poolSize, legacy.selection.pool_size);
}
console.log('New Core general wild encounter planning matches canonical legacy oracle: ok');

import { GENERAL_ENCOUNTER_RULES, drawGeneralWildEncounter } from '../core/encounters/general-wild.js';

const ZERO_STATS = Object.freeze({ HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });

function stageBandForDay(day) {
  const dayScaling = Math.floor((day - 1) / GENERAL_ENCOUNTER_RULES.dayInterval);
  const baseLevel = Math.max(
    GENERAL_ENCOUNTER_RULES.minLevel,
    Math.min(GENERAL_ENCOUNTER_RULES.maxLevel, GENERAL_ENCOUNTER_RULES.baseLevel + dayScaling * GENERAL_ENCOUNTER_RULES.levelsPerScaling),
  );
  const band = GENERAL_ENCOUNTER_RULES.stageBands.find((entry) => baseLevel >= entry.minLevel && baseLevel <= entry.maxLevel);
  if (!band) throw new Error(`no general encounter stage band for day ${day}`);
  return band;
}

function calculateZeroIvEvHp(baseHp, level) {
  const base = Number(baseHp);
  if (!Number.isInteger(base) || base < 1) throw new Error('species master requires positive base HP');
  if (base === 1) return 1;
  return Math.floor((base * 2 * level) / 100) + level + 10;
}

async function defaultDependencies() {
  const demand = await import('../../runtime/safari-general-data-demand.js');
  await demand.ensureSafariGeneralCombatData('wild');
  const { encounterRuntime } = demand.safariGeneralCombatModules('wild');
  const data = await import('../../runtime/safari-playable-data.js');
  return {
    encounterRuntime,
    speciesMasters: data.SAFARI_SPECIES_MASTERS,
    moveMasters: data.SAFARI_MOVE_MASTERS,
  };
}

export async function prepareBrowserGeneralWildEncounter({
  rngState,
  day,
  slot,
  requiredType,
  battleId = null,
} = {}, dependencies = null) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError('day must be >= 1');
  if (!Number.isInteger(slot) || slot < 0 || slot > 7) throw new RangeError('slot must be 0..7');
  if (typeof requiredType !== 'string' || !requiredType) throw new TypeError('requiredType is required');

  const band = stageBandForDay(day);
  const poolData = await import('../../runtime/general-encounter-species-pools.js');
  const speciesPool = poolData.buildGeneralEncounterSpeciesPool(requiredType, [...band.stages]);
  const drawn = drawGeneralWildEncounter(rngState, { day, requiredType, speciesPool });
  const loaded = dependencies ?? await defaultDependencies();
  const canonical = loaded.encounterRuntime.resolveSafariGeneralEncounter({
    day,
    requiredType,
    enemyRank: 'NORMAL',
    extraModifier: 0,
    speciesIndex: drawn.plan.speciesIndex,
    varianceIndex: drawn.plan.varianceIndex,
  });
  if (canonical.species_id !== drawn.plan.speciesId || canonical.resolved_level !== drawn.plan.level) {
    throw new Error(`New Core/general-data encounter differential: ${drawn.plan.speciesId}@${drawn.plan.level} vs ${canonical.species_id}@${canonical.resolved_level}`);
  }

  const speciesMaster = loaded.speciesMasters[canonical.species_id];
  if (!speciesMaster) throw new Error(`missing canonical species master: ${canonical.species_id}`);
  const baseExp = Number(speciesMaster.base_exp);
  if (!Number.isInteger(baseExp) || baseExp < 0) throw new Error(`missing canonical base Exp: ${canonical.species_id}`);
  const maxhp = calculateZeroIvEvHp(speciesMaster.base_stats?.HP, canonical.resolved_level);
  const moves = canonical.move_ids.map((id) => {
    const master = loaded.moveMasters[id];
    const maxpp = Number(master?.total_pp);
    if (!Number.isInteger(maxpp) || maxpp < 1) throw new Error(`missing canonical move PP: ${id}`);
    return { id, pp: maxpp, maxpp, ppup: 0 };
  });
  if (!moves.length) throw new Error(`canonical encounter has no moves: ${canonical.species_id}`);

  const encounterKey = battleId ?? `d${day}:s${slot}`;
  const pokemon = Object.freeze({
    id: `wild:${encounterKey}:${canonical.species_id}`,
    species: canonical.species_id,
    name: speciesMaster.name ?? canonical.species_name ?? canonical.species_id,
    level: canonical.resolved_level,
    nature_id: 'HARDY',
    iv: ZERO_STATS,
    ev: ZERO_STATS,
    hp: maxhp,
    maxhp,
    status: '',
    heldItem: '',
    fainted: false,
    moves: Object.freeze(moves.map((move) => Object.freeze(move))),
  });
  return Object.freeze({
    rngStateBefore: Number(rngState) >>> 0,
    nextRngState: drawn.nextRngState,
    encounter: Object.freeze({
      species: canonical.species_id,
      speciesId: canonical.species_id,
      speciesName: speciesMaster.name ?? canonical.species_name ?? canonical.species_id,
      type: requiredType,
      level: canonical.resolved_level,
      baseExp,
      pokemon,
    }),
    selection: drawn.plan,
  });
}

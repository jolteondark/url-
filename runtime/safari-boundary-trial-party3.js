import { projectGeneralEncounterRules } from "./general-encounter-rules-master.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { SAFARI_NATURE_MASTERS } from "./safari-playable-data.js";
import { SAFARI_GENERAL_MOVE_MASTERS, SAFARI_GENERAL_SPECIES_MASTERS } from "./safari-general-encounter-data-loader.js";
import { boundaryParty3DefinitionV108 } from "./mapless-boundary-trial-party3-v108.js";

const STATS = Object.freeze(["HP","ATTACK","DEFENSE","SPECIAL_ATTACK","SPECIAL_DEFENSE","SPEED"]);
const IV31 = Object.freeze(Object.fromEntries(STATS.map((stat) => [stat, 31])));
const EV0 = Object.freeze(Object.fromEntries(STATS.map((stat) => [stat, 0])));

export function boundaryTrialBaseLevelV108(floor) {
  const day = Math.max(1, Math.trunc(Number(floor)));
  const scaling = projectGeneralEncounterRules().enemyScaling;
  const dayScaling = Math.floor((day - 1) / scaling.dayInterval);
  const effectiveScaling = Math.max(dayScaling + scaling.rankModifiers.NORMAL, 0);
  return Math.max(scaling.minLevel, Math.min(scaling.maxLevel,
    scaling.baseLevel + effectiveScaling * scaling.levelsPerScaling));
}

function materializeMember(member, baseLevel) {
  const speciesMaster = SAFARI_GENERAL_SPECIES_MASTERS[member.species];
  if (!speciesMaster) throw new RangeError(`missing canonical boundary species master: ${member.species}`);
  for (const move of member.moves) {
    if (!SAFARI_GENERAL_MOVE_MASTERS[move]) throw new RangeError(`missing canonical boundary move master: ${move}`);
  }
  let pokemon = resolvePokemonRuntimeMasters({
    species: member.species,
    form: 0,
    level: baseLevel + (member.ace ? 2 : 0),
    status: "NONE",
    status_count: 0,
    ability_id: member.ability,
    item: member.item,
    nature_id: "HARDY",
    nature_for_stats_id: "HARDY",
    shiny: false,
    moves: [...member.moves],
    iv: { ...IV31 },
    ev: { ...EV0 },
  }, {
    species_master: speciesMaster,
    nature_master: SAFARI_NATURE_MASTERS.HARDY,
    move_masters: SAFARI_GENERAL_MOVE_MASTERS,
  });
  // Pokemon.new followed by the canonical trial setup is fully healed.
  pokemon = { ...pokemon, hp: pokemon.max_hp };
  return pokemon;
}

export function materializeSafariBoundaryParty3({ leaderId, floor } = {}) {
  const definition = boundaryParty3DefinitionV108(leaderId);
  const baseLevel = boundaryTrialBaseLevelV108(floor);
  const party = definition.members.map((member) => materializeMember(member, baseLevel));
  return {
    leader_id: String(leaderId).toUpperCase(),
    trainer_type: definition.trainer_type,
    trainer_name: definition.trainer_name,
    trainer_full_name: definition.trainer_full_name,
    gender: definition.gender,
    skill_level: 64,
    floor: Math.max(1, Math.trunc(Number(floor))),
    base_level: baseLevel,
    party_size: 3,
    party,
  };
}

export const SAFARI_BOUNDARY_TRIAL_PARTY3_CONSTANTS = Object.freeze({
  aiSkillLevel: 64,
  aceLevelBonus: 2,
  iv: IV31,
  ev: EV0,
  nature: "HARDY",
});

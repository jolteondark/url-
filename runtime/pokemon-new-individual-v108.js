import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { POKEMON_NATURE_MASTERS_V108, POKEMON_NATURE_ORDER_V108 } from "./pokemon-nature-masters-v108.js";
import {
  POKEMON_NEW_CREATION_FORM_GENERAL_V108,
  resolvePokemonNewCreationFormSpeciesMasterV108,
  resolvePokemonNewCreationFormV108,
} from "./pokemon-new-creation-form-v108.js";

export { POKEMON_NEW_CREATION_FORM_GENERAL_V108 } from "./pokemon-new-creation-form-v108.js";
export const POKEMON_NEW_IV_STAT_ORDER_V108 = Object.freeze(["HP","ATTACK","DEFENSE","SPECIAL_ATTACK","SPECIAL_DEFENSE","SPEED"]);
const GENDER_RATIO_FEMALE_CHANCE = Object.freeze({ FemaleOneEighth:32, Female25Percent:64, Female50Percent:128, Female75Percent:192, FemaleSevenEighths:224 });
function uint32(value, field) { const number=Number(value); if(!Number.isInteger(number)||number<0||number>0xffffffff) throw new RangeError(`${field} must be uint32`); return number>>>0; }
function positiveLevel(value) { const number=Number(value); if(!Number.isInteger(number)||number<1) throw new RangeError("level must be a positive integer"); return number; }
function randomDraw(randomInt, limit, label, trace) { if(typeof randomInt!=="function") throw new TypeError("randomInt is required"); const value=Number(randomInt(limit)); if(!Number.isInteger(value)||value<0||value>=limit) throw new RangeError(`randomInt(${limit}) returned invalid ${label}: ${value}`); trace.push({label,limit,value}); return value; }
export function resetPokemonNewMoveIdsV108(speciesMaster, level) { const currentLevel=positiveLevel(level); if(!speciesMaster||typeof speciesMaster!=="object"||!Array.isArray(speciesMaster.level_moves)) throw new TypeError("speciesMaster.level_moves is required"); const eligible=speciesMaster.level_moves.filter((entry)=>Number(entry?.level)<=currentLevel).map((entry)=>String(entry?.move??"")); if(eligible.some((move)=>!move)) throw new TypeError("level-up move id is required"); const seen=new Set(); const latestReversed=[]; for(let index=eligible.length-1;index>=0;index-=1){if(seen.has(eligible[index]))continue;seen.add(eligible[index]);latestReversed.push(eligible[index]);} return latestReversed.reverse().slice(-4); }
export function resolvePokemonGenderV108(genderRatio, personalId) { const ratio=String(genderRatio??""); const pid=uint32(personalId,"personalId"); if(ratio==="AlwaysMale")return 0;if(ratio==="AlwaysFemale")return 1;if(ratio==="Genderless")return 2;const femaleChance=GENDER_RATIO_FEMALE_CHANCE[ratio];if(!Number.isInteger(femaleChance))throw new TypeError(`unknown gender ratio: ${ratio}`);return ((pid&0xff)<femaleChance)?1:0; }
export function assertPokemonNewCreationFormSupportedV108(species) { const id=String(species??""); if(!id)throw new TypeError("species is required"); return true; }

export function createPokemonNewIndividualV108(input={}) {
  const species=String(input.species??""); const level=positiveLevel(input.level); const baseSpeciesMaster=input.speciesMaster;
  if(!baseSpeciesMaster||baseSpeciesMaster.id!==species) throw new TypeError("matching speciesMaster is required");
  const finalPersonalId=uint32(input.finalPersonalId,"finalPersonalId"); const trace=[]; const iv={};
  for(const stat of POKEMON_NEW_IV_STAT_ORDER_V108) iv[stat]=randomDraw(input.randomInt,32,`iv.${stat}`,trace);
  const personalLow=randomDraw(input.randomInt,0x10000,"initial_personal_id.low16",trace); const personalHigh=randomDraw(input.randomInt,0x10000,"initial_personal_id.high16",trace); const initialPersonalId=(personalLow|(personalHigh<<16))>>>0;
  const natureId=POKEMON_NATURE_ORDER_V108[initialPersonalId%POKEMON_NATURE_ORDER_V108.length];
  const initialGender=resolvePokemonGenderV108(baseSpeciesMaster.gender_ratio,initialPersonalId);
  const form=resolvePokemonNewCreationFormV108({species,initialPersonalId,initialNatureId:natureId,initialGender,creationFormContext:input.creationFormContext,randomInt(limit,label){return randomDraw(input.randomInt,limit,label,trace);}});
  const speciesMaster=resolvePokemonNewCreationFormSpeciesMasterV108(baseSpeciesMaster,form); const moveIds=resetPokemonNewMoveIdsV108(speciesMaster,level);
  const gender=resolvePokemonGenderV108(speciesMaster.gender_ratio,finalPersonalId); const abilityIndex=finalPersonalId&1; const zeroStats=Object.fromEntries(POKEMON_NEW_IV_STAT_ORDER_V108.map((stat)=>[stat,0]));
  const runtime=resolvePokemonRuntimeMasters({species,level,form,personal_id:finalPersonalId,gender,ability_index:abilityIndex,nature_id:natureId,iv,ev:zeroStats,hp:1,status:"NONE",item:null,moves:moveIds,mapless_bonus_stats:zeroStats},{species_master:speciesMaster,nature_master:POKEMON_NATURE_MASTERS_V108[natureId],move_masters:input.moveMasters});
  return {pokemon:runtime,initialPersonalId,finalPersonalId,natureId,gender,abilityIndex,form,moveIds,randomTrace:trace};
}

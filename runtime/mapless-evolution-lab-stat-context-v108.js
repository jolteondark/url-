import { EVO_LAB_BASE_STATS_V108_1 } from "./mapless-evolution-lab-base-stats-v108-1.js";
import { EVO_LAB_BASE_STATS_V108_2 } from "./mapless-evolution-lab-base-stats-v108-2.js";
import { EVO_LAB_BASE_STATS_V108_3 } from "./mapless-evolution-lab-base-stats-v108-3.js";
import { EVO_LAB_BASE_STATS_V108_4 } from "./mapless-evolution-lab-base-stats-v108-4.js";
import { resolveEvolutionLabGrowthRateV108 } from "./mapless-evolution-lab-growth-v108.js";

// Canonical v0.9.108 Evolution Lab stat context. Base stats and growth rates are generated only
// for species eligible for stable/maximum output from the v0.9.108 PBS + species_evolution.csv.
const BASE=Object.freeze({...EVO_LAB_BASE_STATS_V108_1,...EVO_LAB_BASE_STATS_V108_2,...EVO_LAB_BASE_STATS_V108_3,...EVO_LAB_BASE_STATS_V108_4});
const FORMS=Object.freeze({"SANDSHREW:1":[50,75,90,10,35,40],"DIGLETT:1":[10,55,30,35,45,90],"MEOWTH:1":[40,35,35,50,40,90],"MEOWTH:2":[50,65,55,40,40,40],"FARFETCHD:1":[52,95,55,58,62,55],"MRMIME:1":[50,65,65,90,90,100],"CORSOLA:1":[60,55,100,65,100,30],"YAMASK:1":[38,55,85,30,65,30],"FLOETTE:5":[74,65,67,125,128,92],"PUMPKABOO:1":[49,66,70,44,55,51],"PUMPKABOO:2":[54,66,70,44,55,46],"PUMPKABOO:3":[59,66,70,44,55,41],"GROWLITHE:1":[60,75,45,65,50,55],"ZORUA:1":[35,60,40,85,40,70],"SLIGGOO:1":[58,75,83,83,113,40],"GIMMIGHOUL:1":[45,30,25,75,45,80],"FLOETTE:6":[74,85,87,155,148,102]});
const NATURE=Object.freeze({"HARDY":[],"LONELY":[["ATTACK",10],["DEFENSE",-10]],"BRAVE":[["ATTACK",10],["SPEED",-10]],"ADAMANT":[["ATTACK",10],["SPECIAL_ATTACK",-10]],"NAUGHTY":[["ATTACK",10],["SPECIAL_DEFENSE",-10]],"BOLD":[["DEFENSE",10],["ATTACK",-10]],"DOCILE":[],"RELAXED":[["DEFENSE",10],["SPEED",-10]],"IMPISH":[["DEFENSE",10],["SPECIAL_ATTACK",-10]],"LAX":[["DEFENSE",10],["SPECIAL_DEFENSE",-10]],"TIMID":[["SPEED",10],["ATTACK",-10]],"HASTY":[["SPEED",10],["DEFENSE",-10]],"SERIOUS":[],"JOLLY":[["SPEED",10],["SPECIAL_ATTACK",-10]],"NAIVE":[["SPEED",10],["SPECIAL_DEFENSE",-10]],"MODEST":[["SPECIAL_ATTACK",10],["ATTACK",-10]],"MILD":[["SPECIAL_ATTACK",10],["DEFENSE",-10]],"QUIET":[["SPECIAL_ATTACK",10],["SPEED",-10]],"BASHFUL":[],"RASH":[["SPECIAL_ATTACK",10],["SPECIAL_DEFENSE",-10]],"CALM":[["SPECIAL_DEFENSE",10],["ATTACK",-10]],"GENTLE":[["SPECIAL_DEFENSE",10],["DEFENSE",-10]],"SASSY":[["SPECIAL_DEFENSE",10],["SPEED",-10]],"CAREFUL":[["SPECIAL_DEFENSE",10],["SPECIAL_ATTACK",-10]],"QUIRKY":[]});
const KEYS=["HP","ATTACK","DEFENSE","SPECIAL_ATTACK","SPECIAL_DEFENSE","SPEED"];
const natureId=(value)=>value==null?null:String(value).trim().toUpperCase();
const speciesId=(value)=>value==null?null:String(value).trim();
const stats=(values)=>Array.isArray(values)&&values.length===6?Object.fromEntries(KEYS.map((key,index)=>[key,values[index]])):null;

export function resolveEvolutionLabPokemonStatContextV108(pokemon) {
  if (!pokemon || typeof pokemon !== "object") return { success:false, result:"pokemon_required" };
  const species=speciesId(pokemon.species);
  const form=Number(pokemon.form ?? 0);
  if (!species || !Number.isInteger(form) || form<0) return { success:false, result:"species_form_required" };
  const base_stats=stats(FORMS[`${species}:${form}`] ?? BASE[species]);
  if (!base_stats) return { success:false, result:"evolution_lab_base_stats_unavailable" };
  const growth_rate=resolveEvolutionLabGrowthRateV108(species);
  if (!growth_rate) return { success:false, result:"growth_rate_context_unavailable" };
  const resolvedNature=natureId(pokemon.nature_for_stats_id ?? pokemon.nature_id);
  if (!resolvedNature || !Object.prototype.hasOwnProperty.call(NATURE,resolvedNature)) return { success:false, result:"nature_stat_context_unavailable" };
  return { success:true, result:"evolution_lab_stat_context_ready", base_stats, nature_stat_changes:NATURE[resolvedNature].map(([stat,amount])=>[stat,amount]), growth_rate, species, form, nature_id:resolvedNature };
}

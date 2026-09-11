import { EVO_LAB_TARGET_META_V108_1 } from "./mapless-evolution-lab-target-meta-v108-1.js";
import { EVO_LAB_TARGET_META_V108_2 } from "./mapless-evolution-lab-target-meta-v108-2.js";
import { EVO_LAB_TARGET_META_V108_3 } from "./mapless-evolution-lab-target-meta-v108-3.js";
import { EVO_LAB_TARGET_META_V108_4 } from "./mapless-evolution-lab-target-meta-v108-4.js";
import { EVO_LAB_TARGET_META_V108_5 } from "./mapless-evolution-lab-target-meta-v108-5.js";
import { EVO_LAB_TARGET_META_V108_6 } from "./mapless-evolution-lab-target-meta-v108-6.js";
import { EVO_LAB_TARGET_META_V108_7 } from "./mapless-evolution-lab-target-meta-v108-7.js";
import { EVO_LAB_TARGET_META_V108_8 } from "./mapless-evolution-lab-target-meta-v108-8.js";
import { resolveEvolutionLabNatureStatChangesV108 } from "./mapless-evolution-lab-stat-context-v108.js";

// Canonical v0.9.108 target-species hydration for Evolution Lab force_evolve intents.
// Species/evolution choice and RNG remain owned by mapless-evolution-lab-v108.js. This
// projection supplies only the Essentials species= / calc_stats context needed to commit
// an already-decided target. Nincada remains fail-closed because Essentials' evolution
// after-effect can duplicate Shedinja into Party and consume a Poké Ball atomically.
const META=Object.freeze({...EVO_LAB_TARGET_META_V108_1,...EVO_LAB_TARGET_META_V108_2,...EVO_LAB_TARGET_META_V108_3,...EVO_LAB_TARGET_META_V108_4,...EVO_LAB_TARGET_META_V108_5,...EVO_LAB_TARGET_META_V108_6,...EVO_LAB_TARGET_META_V108_7,...EVO_LAB_TARGET_META_V108_8});

const id=(value)=>value==null?null:String(value).trim().toUpperCase();
// Essentials PBS BaseStats order is HP, Attack, Defense, Speed, Special Attack, Special Defense.
// Pokémon Runtime's stat object order is HP, Attack, Defense, Special Attack, Special Defense, Speed.
const stats=(values)=>Array.isArray(values)&&values.length===6
  ? {
      HP:Number(values[0]),
      ATTACK:Number(values[1]),
      DEFENSE:Number(values[2]),
      SPECIAL_ATTACK:Number(values[4]),
      SPECIAL_DEFENSE:Number(values[5]),
      SPEED:Number(values[3]),
    }
  : null;

function resolveGender(ratio,currentGender) {
  if (ratio === "AlwaysMale") return 0;
  if (ratio === "AlwaysFemale") return 1;
  if (ratio === "Genderless") return 2;
  return currentGender ?? null;
}

function resolveAbility(meta,pokemon) {
  const abilities=Array.isArray(meta.a)?meta.a:[];
  const hidden=Array.isArray(meta.h)?meta.h:[];
  const personal=Number(pokemon.personal_id);
  let index=pokemon.ability_index==null?null:Number(pokemon.ability_index);
  if (index==null) {
    if (!Number.isInteger(personal)) return null;
    index=personal&1;
  }
  if (!Number.isInteger(index)||index<0) return null;
  if (index>=2) {
    const hiddenAbility=hidden[index-2];
    if (hiddenAbility) return hiddenAbility;
    if (!Number.isInteger(personal)) return null;
    index=personal&1;
  }
  return abilities[index]??abilities[0]??null;
}

export function resolveEvolutionLabForceEvolutionContextV108(pokemon,operation) {
  if (!pokemon||typeof pokemon!=="object") return {success:false,result:"pokemon_required"};
  if (!operation||typeof operation!=="object"||operation.op!=="force_evolve") return {success:false,result:"force_evolution_intent_required"};
  const source=id(pokemon.species);
  const target=id(operation.species);
  if (!source||!target) return {success:false,result:"force_evolution_species_required"};
  if (source==="NINCADA") return {success:false,result:"evolution_after_effect_owner_required"};
  const base=META[target];
  if (!base) return {success:false,result:"evolution_target_context_unavailable",source,target};
  const sourceForm=Number(pokemon.form??0);
  if (!Number.isInteger(sourceForm)||sourceForm<0) return {success:false,result:"evolution_source_form_required",source,target};
  const targetForm=Number.isInteger(base.d)&&base.d>=0?base.d:sourceForm;
  const override=base.f?.[String(targetForm)]??null;
  const effective={...base,...(override??{})};
  const baseStats=stats(effective.b);
  if (!baseStats||!effective.r) return {success:false,result:"force_evolution_stat_context_unavailable",source,target};
  const nature=resolveEvolutionLabNatureStatChangesV108(pokemon);
  if (nature.success!==true) return nature;
  const abilityId=resolveAbility(effective,pokemon);
  if (!abilityId) return {success:false,result:"force_evolution_ability_context_unavailable",source,target};
  return {
    success:true,
    result:"force_evolution_context_ready",
    source,
    target,
    target_form:targetForm,
    gender:resolveGender(effective.g,pokemon.gender),
    ability_id:abilityId,
    base_stats:baseStats,
    growth_rate:effective.r,
    nature_stat_changes:nature.nature_stat_changes,
    after_evolution_effect:false,
  };
}

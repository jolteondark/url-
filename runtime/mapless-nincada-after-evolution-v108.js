import { commitCanonicalPokemonMutationV108 } from "./mapless-pokemon-mutation-v108.js";
import { resolveEvolutionLabForceEvolutionContextV108 } from "./mapless-evolution-lab-force-evolution-context-v108.js";

const id=(value)=>value==null?null:String(value).trim().toUpperCase();

function healDuplicate(pokemon) {
  pokemon.hp=Number(pokemon.max_hp ?? pokemon.hp ?? 0);
  pokemon.status="NONE";
  pokemon.status_count=0;
  pokemon.ready_to_evolve=false;
  if (Array.isArray(pokemon.moves)) {
    pokemon.moves=pokemon.moves.map((move)=>{
      if (!move||typeof move!=="object") return move;
      const next={...move};
      const maximum=Number(next.total_pp ?? next.max_pp ?? next.pp);
      if (Number.isFinite(maximum)) next.pp=maximum;
      return next;
    });
  }
  return pokemon;
}

// Canonical Essentials v21.1 / Mapless v0.9.108 after-evolution owner for the
// Nincada Shedinja side-effect. The base evolution is never blocked by missing
// party space or Poké Ball; those conditions only suppress the duplicate.
export function resolveCanonicalNincadaAfterEvolutionV108({ pokemon, partyLength=0, hasPokeBall=false }={}) {
  if (!pokemon||typeof pokemon!=="object") return {success:false,result:"pokemon_required",applicable:false};
  if (id(pokemon.species)!=="NINCADA") return {success:true,result:"not_applicable",applicable:false,duplicate:null,consumePokeBall:false,operations:[]};
  if (Number(partyLength)>=6) {
    return {success:true,result:"party_full",applicable:true,duplicate:null,consumePokeBall:false,sourceContextPatch:{after_evolution_effect_owner_ready:true},operations:[{op:"shedinja_after_evolution",result:"party_full"}]};
  }
  if (!hasPokeBall) {
    return {success:true,result:"poke_ball_missing",applicable:true,duplicate:null,consumePokeBall:false,sourceContextPatch:{after_evolution_effect_owner_ready:true},operations:[{op:"shedinja_after_evolution",result:"poke_ball_missing"}]};
  }

  const operation={op:"force_evolve",species:"SHEDINJA"};
  const context=resolveEvolutionLabForceEvolutionContextV108(pokemon,operation);
  if (context.success!==true) return {...context,applicable:true};
  const committed=commitCanonicalPokemonMutationV108(structuredClone(pokemon),operation,{
    ...context,
    after_evolution_effect_owner_ready:true,
  });
  if (committed.success!==true) return {...committed,applicable:true};

  const duplicate=healDuplicate(committed.pokemon);
  duplicate.nickname=null;
  duplicate.markings=[];
  duplicate.poke_ball="POKEBALL";
  duplicate.item=null;
  duplicate.ribbons=[];

  return {
    success:true,
    result:"shedinja_duplicate_ready",
    applicable:true,
    duplicate,
    consumePokeBall:true,
    sourceContextPatch:{after_evolution_effect_owner_ready:true},
    operations:[{
      op:"duplicate_pokemon_after_evolution",
      species:"SHEDINJA",
      consume_item:"POKEBALL",
      result:true,
    }],
  };
}

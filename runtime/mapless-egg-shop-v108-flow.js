import { projectGeneralEncounterSpeciesPools } from "./general-encounter-species-pools.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { createPokemonNewIndividualV108 } from "./pokemon-new-individual-v108.js";

export const MAPLESS_EGG_SHOP_STOCK_COUNT_V108 = 5;
export const MAPLESS_EGG_SHOP_PRICE_V108 = 1000;
export const MAPLESS_EGG_SHOP_STOCK_SEED_V108 = 4009;
export const MAPLESS_HATCH_VISITS_VERSION_V108 = 918;
export const MAPLESS_HATCH_REQUIRED_VISITS_V108 = 20;
const ALLOWED_STAGES = Object.freeze(["NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE"]);

const CUSTOM_EGG_TYPES_V108 = Object.freeze({
  DELTABULBASAUR:["FAIRY","PSYCHIC"],DELTACHARMANDER:["GHOST","DRAGON"],DELTASQUIRTLE:["DARK","FIGHTING"],DELTAPAWNIARD:["FLYING","FIGHTING"],DELTARALTS:["ELECTRIC","ICE"],DELTASUNKERN:["FIRE","POISON"],DELTABERGMITE:["ROCK"],DELTASCYTHER:["ICE","FIGHTING"],DELTASCRAGGY:["GRASS"],DELTACOMBEE:["STEEL","FIRE"],DELTAKOFFING:["ELECTRIC","FLYING"],DELTAPURRLOIN:["GHOST","FAIRY"],DELTAPHANTUMP:["FAIRY"],DELTASNORUNT:["FIRE"],DELTASHINX:["STEEL","POISON"],DELTANOIBAT:["GRASS","STEEL"],DELTABUDEW:["DARK","FAIRY"],DELTADRIFLOON:["FIRE","FLYING"],DELTAGRIMER:["GROUND"],DELTAWOOPER:["GRASS","FIRE"],DELTAMUNCHLAX:["GRASS"],DELTAMISDREAVUS:["ICE","FAIRY"],DELTACYNDAQUIL:["ELECTRIC"],DELTATREECKO:["NORMAL","FIGHTING"],DELTATORCHIC:["PSYCHIC"],DELTATURTWIG:["WATER","GROUND"],DELTASNIVY:["WATER"],DELTAFROAKIE:["GRASS"],DELTAPIDGEY:["DARK","DRAGON"],DELTADIGLETT:["ICE","NORMAL"],DELTAGROWLITHE:["NORMAL","DRAGON"],DELTAGEODUDE:["PSYCHIC","ROCK"],DELTATENTACOOL:["GRASS","POISON"],DELTADODUO:["PSYCHIC"],DELTATANGELA:["GROUND"],DELTADITTO:["NORMAL"],DELTAKABUTO:["BUG","DARK"],DELTADRATINI:["WATER","ELECTRIC"],DELTAHOOTHOOT:["ICE","FLYING"],DELTACHINCHOU:["GHOST","FIRE"],DELTAPICHU:["FLYING","FAIRY"],DELTAAIPOM:["GHOST","NORMAL"],DELTAYANMA:["GRASS","FLYING"],DELTAGIRAFARIG:["STEEL","POISON"],DELTADUNSPARCE:["BUG","WATER"],DELTASHUCKLE:["FIGHTING","STEEL"],DELTAREMORAID:["FIRE"],DELTAELEKID:["ROCK"],DELTAMAGBY:["WATER"],DELTALOTAD:["PSYCHIC","WATER"],DELTASEEDOT:["ELECTRIC"],DELTASABLEYE:["FIRE","ROCK"],DELTAMAWILE:["GRASS","DARK"],DELTAARON:["FIRE","STEEL"],DELTAMEDITITE:["FAIRY"],DELTANUMEL:["POISON"],DELTAPLUSLE:["FIRE","FAIRY"],DELTAMINUN:["ICE","FAIRY"],DELTAWAILMER:["ICE","FLYING"],DELTAFEEBAS:["GHOST"],DELTACLAMPERL:["DRAGON"],DELTABELDUM1:["GROUND","BUG"],DELTABELDUM2:["GRASS","ROCK"],DELTABUNEARY:["FIGHTING"],DELTARIOLU:["DARK"],DELTACROAGUNK:["FIRE"],DELTAVENIPEDE:["ROCK","FIRE"],DELTAPETILIL1:["WATER","FIRE"],DELTAPETILIL2:["FAIRY","FLYING"],DELTASOLOSIS:["GHOST","ROCK"],DELTADARUMAKA:["DARK","GHOST"],DELTAMARACTUS:["STEEL"],DELTADWEBBLE1:["GRASS","POISON"],DELTADWEBBLE2:["FAIRY","NORMAL"],DELTAYAMASK:["STEEL","POISON"],DELTAEMOLGA:["FIRE","DARK"],DELTAKARRABLAST:["FAIRY"],DELTAFOONGUS:["GHOST","DARK"],DELTALITWICK:["FAIRY","FIRE"],DELTAAXEW:["WATER"],DELTAGOLETT:["FIGHTING","STEEL"],DELTAHEATMOR:["POISON","STEEL"],DELTADEINO:["GROUND","POISON"],DELTALARVESTA:["DARK","POISON"],DELTAAMAURA:["GRASS","WATER"],DELTAGOOMY:["GROUND","WATER"],DELTAREGIROCK:["GROUND"],DELTAREGICE:["WATER"],DELTAREGISTEEL:["FIRE"],DELTAMELOETTA:["DARK","FAIRY"],DELTAHOOPA:["FLYING"]
});

export const MAPLESS_EGG_SHOP_CUSTOM_SPECIES_MASTERS_V108 = Object.freeze({
  DELTADODUO:Object.freeze({
    id:"DELTADODUO",name:"DELTADODUO",dex_number:2082,gender_ratio:"Female50Percent",
    base_stats:Object.freeze({HP:35,ATTACK:85,DEFENSE:45,SPEED:75,SPECIAL_ATTACK:35,SPECIAL_DEFENSE:35}),
    base_exp:62,catch_rate:190,
    level_moves:Object.freeze([
      {level:1,move:"PECK"},{level:1,move:"GROWL"},{level:5,move:"PSYWAVE"},{level:9,move:"MIRACLEEYE"},{level:13,move:"PSYBEAM"},{level:17,move:"MINDREADER"},{level:21,move:"LOWKICK"},{level:25,move:"PSYCHOCUT"},{level:29,move:"HYPNOSIS"},{level:33,move:"WORKUP"},{level:37,move:"DRILLPECK"},{level:41,move:"SYNCHRONOISE"},{level:45,move:"ZENHEADBUTT"},{level:49,move:"FUTURESIGHT"}
    ].map(Object.freeze)),
  })
});

function generalTypeIndex() {
  const projected = projectGeneralEncounterSpeciesPools();
  const bySpecies = new Map();
  for (const [type, byStage] of Object.entries(projected)) {
    for (const stage of ALLOWED_STAGES) {
      for (const species of byStage?.[stage] ?? []) {
        const types = bySpecies.get(species) ?? [];
        if (!types.includes(type)) types.push(type);
        bySpecies.set(species, types);
      }
    }
  }
  return bySpecies;
}

export function maplessEggShopCandidatePoolV108() {
  const general = generalTypeIndex();
  const ids = new Set([...general.keys(), ...Object.keys(CUSTOM_EGG_TYPES_V108)]);
  return [...ids].sort();
}

export function maplessEggShopTypesV108(species) {
  const id = String(species ?? "");
  if (CUSTOM_EGG_TYPES_V108[id]) return [...CUSTOM_EGG_TYPES_V108[id]];
  return [...(generalTypeIndex().get(id) ?? [])];
}

export function maplessEggShopStockForDayV108(day) {
  const normalizedDay = Math.max(1, Math.trunc(Number(day) || 1));
  const pool = maplessEggShopCandidatePoolV108();
  const rng = new RubyMT19937Random((normalizedDay * 1000003) + MAPLESS_EGG_SHOP_STOCK_SEED_V108);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = rng.randInt(index + 1);
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, Math.min(MAPLESS_EGG_SHOP_STOCK_COUNT_V108, pool.length));
}

export function maplessEggShopBaseLevelForDayV108(day) {
  const normalizedDay = Math.max(1, Math.trunc(Number(day) || 1));
  return Math.max(1, Math.min(100, 3 + (Math.floor((normalizedDay - 1) / 5) * 2)));
}

export function maplessEggShopHatchLevelForDayV108(day, randomInt) {
  if (typeof randomInt !== "function") throw new TypeError("randomInt is required");
  const roll = Number(randomInt(3));
  if (!Number.isInteger(roll) || roll < 0 || roll >= 3) throw new RangeError("randomInt(3) must return 0..2");
  return Math.max(1, Math.min(100, maplessEggShopBaseLevelForDayV108(day) + (roll - 1)));
}

export function createMaplessEggShopEggV108({ species, day, speciesMaster, moveMasters, randomInt, finalPersonalId, creationFormContext = null } = {}) {
  const level = maplessEggShopHatchLevelForDayV108(day, randomInt);
  const resolved = createPokemonNewIndividualV108({
    species, level, speciesMaster, moveMasters, randomInt, finalPersonalId, creationFormContext,
  });
  const egg = structuredClone(resolved.pokemon);
  egg.steps_to_hatch = MAPLESS_HATCH_REQUIRED_VISITS_V108;
  egg.mapless_hatch_system_version = MAPLESS_HATCH_VISITS_VERSION_V108;
  egg.mapless_egg_shop_bonus_pending = true;
  egg.mapless_egg_shop_day = Math.max(1, Math.trunc(Number(day) || 1));
  egg.mapless_hatch_level = level;
  egg.obtain_method = 1;
  egg.obtain_text = "卵屋";
  return { egg, level, species, trace: resolved.randomTrace };
}

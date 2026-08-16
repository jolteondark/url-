export const POKEMON_NEW_CREATION_FORM_GENERAL_V108 = Object.freeze([
  "UNOWN","BURMY","WORMADAM","SCATTERBUG","SPEWPA","VIVILLON","PUMPKABOO","GOURGEIST","LYCANROC","MINIOR",
  "TOXEL","TOXTRICITY","SINISTEA","POLTEAGEIST","ALCREMIE","DUNSPARCE","DUDUNSPARCE","BASCULEGION","LECHONK","OINKOLOGNE",
  "TANDEMAUS","MAUSHOLD","SQUAWKABILLY","TATSUGIRI","POLTCHAGEIST","SINISTCHA",
]);

// Public GENERAL masters expose the fields consumed by Pokemon Runtime. These
// canonical form overrides therefore project the stat/move differences that
// affect materialized browser individuals; type/ability-only PBS differences
// remain outside the current public master contract.
const RUNTIME_FORM_OVERRIDES = Object.freeze({
  "WORMADAM,1": { base_stats:{HP:60,ATTACK:79,DEFENSE:105,SPEED:36,SPECIAL_ATTACK:59,SPECIAL_DEFENSE:85}, level_moves:[{level:0,move:"QUIVERDANCE"},{level:1,move:"SUCKERPUNCH"},{level:1,move:"TACKLE"},{level:1,move:"PROTECT"},{level:1,move:"BUGBITE"},{level:10,move:"PROTECT"},{level:15,move:"BUGBITE"},{level:20,move:"STRINGSHOT"},{level:23,move:"CONFUSION"},{level:26,move:"ROCKBLAST"},{level:29,move:"HARDEN"},{level:32,move:"PSYBEAM"},{level:35,move:"INFESTATION"},{level:38,move:"FLAIL"},{level:41,move:"ATTRACT"},{level:44,move:"PSYCHIC"},{level:47,move:"FISSURE"},{level:50,move:"BUGBUZZ"}] },
  "WORMADAM,2": { base_stats:{HP:60,ATTACK:69,DEFENSE:95,SPEED:36,SPECIAL_ATTACK:69,SPECIAL_DEFENSE:95}, level_moves:[{level:0,move:"QUIVERDANCE"},{level:1,move:"METALBURST"},{level:1,move:"SUCKERPUNCH"},{level:1,move:"TACKLE"},{level:1,move:"PROTECT"},{level:1,move:"BUGBITE"},{level:10,move:"PROTECT"},{level:15,move:"BUGBITE"},{level:20,move:"STRINGSHOT"},{level:23,move:"CONFUSION"},{level:26,move:"METALBURST"},{level:29,move:"METALSOUND"},{level:32,move:"PSYBEAM"},{level:35,move:"INFESTATION"},{level:38,move:"FLAIL"},{level:41,move:"ATTRACT"},{level:44,move:"PSYCHIC"},{level:47,move:"IRONHEAD"},{level:50,move:"BUGBUZZ"}] },
  "PUMPKABOO,1": { base_stats:{HP:49,ATTACK:66,DEFENSE:70,SPEED:51,SPECIAL_ATTACK:44,SPECIAL_DEFENSE:55} },
  "PUMPKABOO,2": { base_stats:{HP:54,ATTACK:66,DEFENSE:70,SPEED:46,SPECIAL_ATTACK:44,SPECIAL_DEFENSE:55} },
  "PUMPKABOO,3": { base_stats:{HP:59,ATTACK:66,DEFENSE:70,SPEED:41,SPECIAL_ATTACK:44,SPECIAL_DEFENSE:55} },
  "GOURGEIST,1": { base_stats:{HP:65,ATTACK:90,DEFENSE:122,SPEED:84,SPECIAL_ATTACK:58,SPECIAL_DEFENSE:75} },
  "GOURGEIST,2": { base_stats:{HP:75,ATTACK:95,DEFENSE:122,SPEED:69,SPECIAL_ATTACK:58,SPECIAL_DEFENSE:75} },
  "GOURGEIST,3": { base_stats:{HP:85,ATTACK:100,DEFENSE:122,SPEED:54,SPECIAL_ATTACK:58,SPECIAL_DEFENSE:75} },
  "LYCANROC,1": { base_stats:{HP:85,ATTACK:115,DEFENSE:75,SPEED:82,SPECIAL_ATTACK:55,SPECIAL_DEFENSE:75}, level_moves:[{level:0,move:"COUNTER"},{level:1,move:"ENDURE"},{level:1,move:"REVERSAL"},{level:1,move:"TAUNT"},{level:1,move:"TACKLE"},{level:1,move:"LEER"},{level:1,move:"SANDATTACK"},{level:1,move:"DOUBLETEAM"},{level:12,move:"ROCKTHROW"},{level:16,move:"HOWL"},{level:20,move:"BITE"},{level:24,move:"ROCKTOMB"},{level:30,move:"ROAR"},{level:36,move:"ROCKSLIDE"},{level:42,move:"CRUNCH"},{level:48,move:"SCARYFACE"},{level:54,move:"STEALTHROCK"},{level:60,move:"STONEEDGE"}] },
  "LYCANROC,2": { base_stats:{HP:75,ATTACK:117,DEFENSE:65,SPEED:110,SPECIAL_ATTACK:55,SPECIAL_DEFENSE:65}, level_moves:[{level:0,move:"CRUSHCLAW"},{level:1,move:"SUCKERPUNCH"},{level:1,move:"ACCELEROCK"},{level:1,move:"QUICKGUARD"},{level:1,move:"QUICKATTACK"},{level:1,move:"COUNTER"},{level:1,move:"ENDURE"},{level:1,move:"REVERSAL"},{level:1,move:"TAUNT"},{level:1,move:"TACKLE"},{level:1,move:"LEER"},{level:1,move:"SANDATTACK"},{level:1,move:"DOUBLETEAM"},{level:12,move:"ROCKTHROW"},{level:16,move:"HOWL"},{level:20,move:"BITE"},{level:24,move:"ROCKTOMB"},{level:30,move:"ROAR"},{level:36,move:"ROCKSLIDE"},{level:42,move:"CRUNCH"},{level:48,move:"SCARYFACE"},{level:54,move:"STEALTHROCK"},{level:60,move:"STONEEDGE"}] },
  "MINIOR,7": { base_stats:{HP:60,ATTACK:100,DEFENSE:60,SPEED:120,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:60} },
  "MINIOR,8": { base_stats:{HP:60,ATTACK:100,DEFENSE:60,SPEED:120,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:60} },
  "MINIOR,9": { base_stats:{HP:60,ATTACK:100,DEFENSE:60,SPEED:120,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:60} },
  "MINIOR,10": { base_stats:{HP:60,ATTACK:100,DEFENSE:60,SPEED:120,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:60} },
  "MINIOR,11": { base_stats:{HP:60,ATTACK:100,DEFENSE:60,SPEED:120,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:60} },
  "MINIOR,12": { base_stats:{HP:60,ATTACK:100,DEFENSE:60,SPEED:120,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:60} },
  "MINIOR,13": { base_stats:{HP:60,ATTACK:100,DEFENSE:60,SPEED:120,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:60} },
  "TOXTRICITY,1": { level_moves:[{level:0,move:"SPARK"},{level:1,move:"BELCH"},{level:1,move:"TEARFULLOOK"},{level:1,move:"NUZZLE"},{level:1,move:"GROWL"},{level:1,move:"FLAIL"},{level:1,move:"ACID"},{level:1,move:"THUNDERSHOCK"},{level:1,move:"ACIDSPRAY"},{level:1,move:"LEER"},{level:1,move:"NOBLEROAR"},{level:4,move:"CHARGE"},{level:8,move:"SHOCKWAVE"},{level:12,move:"SCARYFACE"},{level:16,move:"TAUNT"},{level:24,move:"SCREECH"},{level:28,move:"SWAGGER"},{level:32,move:"TOXIC"},{level:36,move:"DISCHARGE"},{level:40,move:"POISONJAB"},{level:44,move:"OVERDRIVE"},{level:48,move:"BOOMBURST"},{level:52,move:"MAGNETICFLUX"}] },
  "BASCULEGION,3": { base_stats:{HP:120,ATTACK:92,DEFENSE:65,SPEED:78,SPECIAL_ATTACK:100,SPECIAL_DEFENSE:75} },
  "OINKOLOGNE,1": { base_stats:{HP:115,ATTACK:90,DEFENSE:70,SPEED:65,SPECIAL_ATTACK:59,SPECIAL_DEFENSE:90}, level_moves:[{level:1,move:"TAILWHIP"},{level:1,move:"TACKLE"},{level:3,move:"DISARMINGVOICE"},{level:6,move:"ECHOEDVOICE"},{level:9,move:"MUDSHOT"},{level:12,move:"COVET"},{level:15,move:"DIG"},{level:17,move:"HEADBUTT"},{level:23,move:"YAWN"},{level:28,move:"TAKEDOWN"},{level:30,move:"WORKUP"},{level:34,move:"UPROAR"},{level:39,move:"DOUBLEEDGE"},{level:45,move:"EARTHPOWER"},{level:51,move:"BELCH"}] },
  "TATSUGIRI,3": { base_stats:{HP:68,ATTACK:65,DEFENSE:90,SPEED:92,SPECIAL_ATTACK:135,SPECIAL_DEFENSE:125} },
  "TATSUGIRI,4": { base_stats:{HP:68,ATTACK:65,DEFENSE:90,SPEED:92,SPECIAL_ATTACK:135,SPECIAL_DEFENSE:125} },
  "TATSUGIRI,5": { base_stats:{HP:68,ATTACK:65,DEFENSE:90,SPEED:92,SPECIAL_ATTACK:135,SPECIAL_DEFENSE:125} },
});

const TOXTRICITY_LOW_KEY_NATURES = new Set([
  "LONELY","BOLD","RELAXED","TIMID","SERIOUS","MODEST","MILD","QUIET","BASHFUL","CALM","GENTLE","CAREFUL",
]);
function requiredInteger(value, field) { const number=Number(value); if(!Number.isInteger(number)||number<0) throw new TypeError(`${field} must be a non-negative integer`); return number; }
function draw(input, limit, label) { if(typeof input.randomInt!=="function") throw new TypeError("randomInt is required for this creation form"); const value=Number(input.randomInt(limit,label)); if(!Number.isInteger(value)||value<0||value>=limit) throw new RangeError(`randomInt(${limit}) returned invalid ${label}: ${value}`); return value; }
function contextualEnvironment(context) { if(!context||typeof context.environment!=="string"||!context.environment) throw new TypeError("creationFormContext.environment is required for Burmy/Wormadam"); return context.environment.toUpperCase(); }
function contextualPlayerSecretId(context) { return requiredInteger(context?.playerSecretId,"creationFormContext.playerSecretId"); }
function contextualDayNight(context) { if(!context||typeof context.dayNight!=="string"||!context.dayNight) throw new TypeError("creationFormContext.dayNight is required for Lycanroc"); return context.dayNight.toUpperCase(); }

export function resolvePokemonNewCreationFormV108(input={}) {
  const species=String(input.species??""); const pid=requiredInteger(input.initialPersonalId,"initialPersonalId")>>>0; const nature=String(input.initialNatureId??""); const gender=Number(input.initialGender);
  switch(species) {
    case "UNOWN": return draw(input,28,"creation_form.UNOWN");
    case "BURMY": case "WORMADAM": { const environment=contextualEnvironment(input.creationFormContext); if(["ROCK","SAND","CAVE"].includes(environment)) return 1; if(environment==="NONE") return 2; return 0; }
    case "SCATTERBUG": case "SPEWPA": case "VIVILLON": return contextualPlayerSecretId(input.creationFormContext)%18;
    case "PUMPKABOO": case "GOURGEIST": { const roll=draw(input,100,`creation_form.${species}`); if(roll<5)return 3; if(roll<20)return 2; if(roll<65)return 1; return 0; }
    case "LYCANROC": { const dayNight=contextualDayNight(input.creationFormContext); if(dayNight==="EVENING")return 2; if(dayNight==="NIGHT")return 1; return 0; }
    case "MINIOR": return 7+draw(input,7,"creation_form.MINIOR");
    case "TOXEL": case "TOXTRICITY": return TOXTRICITY_LOW_KEY_NATURES.has(nature)?1:0;
    case "SINISTEA": case "POLTEAGEIST": case "POLTCHAGEIST": case "SINISTCHA": return draw(input,100,`creation_form.${species}`)<10?1:0;
    case "ALCREMIE": return draw(input,63,"creation_form.ALCREMIE");
    case "DUNSPARCE": case "DUDUNSPARCE": case "TANDEMAUS": case "MAUSHOLD": return pid%100===0?1:0;
    case "BASCULEGION": if(gender!==0&&gender!==1) throw new TypeError("initialGender must resolve male/female for Basculegion"); return gender===1?3:2;
    case "LECHONK": case "OINKOLOGNE": if(gender!==0&&gender!==1) throw new TypeError(`initialGender must resolve male/female for ${species}`); return gender;
    case "SQUAWKABILLY": return draw(input,4,"creation_form.SQUAWKABILLY");
    case "TATSUGIRI": return draw(input,3,"creation_form.TATSUGIRI");
    default: return 0;
  }
}
function cloneValue(value) { if(Array.isArray(value)) return value.map(cloneValue); if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,cloneValue(child)])); return value; }
export function resolvePokemonNewCreationFormSpeciesMasterV108(baseMaster, form) { if(!baseMaster||typeof baseMaster!=="object"||Array.isArray(baseMaster)||typeof baseMaster.id!=="string") throw new TypeError("base species master is required"); if(!Number.isInteger(form)||form<0) throw new TypeError("form must be a non-negative integer"); const override=RUNTIME_FORM_OVERRIDES[`${baseMaster.id},${form}`]??null; if(!override)return {...baseMaster,form}; return {...baseMaster,...cloneValue(override),form}; }
export const POKEMON_NEW_CREATION_FORM_RUNTIME_METADATA_V108 = Object.freeze({ speciesCount:POKEMON_NEW_CREATION_FORM_GENERAL_V108.length, runtimeOverrideCount:Object.keys(RUNTIME_FORM_OVERRIDES).length, canonicalFilteredCoreSha256:"e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab" });

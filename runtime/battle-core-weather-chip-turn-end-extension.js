import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const SANDSTORM_IMMUNE_TYPES = new Set(["ROCK", "GROUND", "STEEL"]);
const SANDSTORM_IMMUNE_ABILITIES = new Set(["SANDFORCE", "SANDRUSH", "SANDVEIL", "MAGICGUARD", "OVERCOAT"]);
const HAIL_IMMUNE_TYPES = new Set(["ICE"]);
const HAIL_IMMUNE_ABILITIES = new Set(["ICEBODY", "SNOWCLOAK", "MAGICGUARD", "OVERCOAT"]);
const WEATHER_DAMAGE_IMMUNE_ITEMS = new Set(["SAFETYGOGGLES"]);

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function pokemonTypes(pokemon) {
  return (Array.isArray(pokemon?.types) ? pokemon.types : []).map(canonicalId).filter(Boolean);
}

function integerHp(pokemon, key, fallback = 0) {
  const value = key === "maxHp" ? (pokemon?.max_hp ?? pokemon?.maxHp) : pokemon?.[key];
  return Math.max(0, Math.trunc(Number(value ?? fallback)));
}

function normalizedWeather(context) {
  return String(context?.effectiveWeather ?? context?.weather ?? "").toUpperCase();
}

function immunityReason({ types, ability, item, weather }) {
  if (WEATHER_DAMAGE_IMMUNE_ITEMS.has(item)) return "held_item";
  if (weather === "SANDSTORM") {
    if (types.some((type) => SANDSTORM_IMMUNE_TYPES.has(type))) return "type";
    if (SANDSTORM_IMMUNE_ABILITIES.has(ability)) return "ability";
  }
  if (weather === "HAIL") {
    if (types.some((type) => HAIL_IMMUNE_TYPES.has(type))) return "type";
    if (HAIL_IMMUNE_ABILITIES.has(ability)) return "ability";
  }
  return null;
}

export function resolveWeatherChipTurnEndCanonical(pokemon = {}, context = {}) {
  const ability = battlePokemonAbilityIdCanonical(pokemon);
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const types = pokemonTypes(pokemon);
  const weather = normalizedWeather(context);
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  const damagingWeather = weather === "SANDSTORM" || weather === "HAIL";
  const immuneSource = damagingWeather ? immunityReason({ types, ability, item, weather }) : null;
  const immune = immuneSource !== null;
  const amount = damagingWeather && !immune && hp > 0 && maxHp > 0
    ? Math.min(hp, Math.floor(maxHp / 16))
    : 0;
  return Object.freeze({
    boundary: "turn_end_weather",
    ability,
    item,
    types: Object.freeze(types),
    weather,
    triggered: amount > 0,
    immune,
    immuneSource,
    hpDelta: -amount,
    reason: amount > 0 ? (weather === "SANDSTORM" ? "sandstorm_damage" : "hail_damage") : null,
  });
}

const WEATHER_DAMAGE_ABILITY_IDS = Object.freeze([...new Set([
  ...SANDSTORM_IMMUNE_ABILITIES,
  ...HAIL_IMMUNE_ABILITIES,
])].sort());
const WEATHER_DAMAGE_ITEM_IDS = Object.freeze([...WEATHER_DAMAGE_IMMUNE_ITEMS].sort());

export const BATTLE_WEATHER_CHIP_TURN_END_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: WEATHER_DAMAGE_ABILITY_IDS,
  itemIds: WEATHER_DAMAGE_ITEM_IDS,
  abilityCount: WEATHER_DAMAGE_ABILITY_IDS.length,
  itemCount: WEATHER_DAMAGE_ITEM_IDS.length,
  classificationCounts: Object.freeze({
    weatherDamageAbilities: WEATHER_DAMAGE_ABILITY_IDS.length,
    weatherDamageHeldItems: WEATHER_DAMAGE_ITEM_IDS.length,
    sandstormImmuneTypes: SANDSTORM_IMMUNE_TYPES.size,
    hailImmuneTypes: HAIL_IMMUNE_TYPES.size,
  }),
});

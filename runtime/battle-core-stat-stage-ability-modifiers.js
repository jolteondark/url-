function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function pokemonAbilityCanonical(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

export const BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["CONTRARY", "SIMPLE"]),
  itemIds: Object.freeze([]),
  abilityCount: 2,
  itemCount: 0,
  classificationCounts: Object.freeze({
    statStageDirectionAbilities: 1,
    statStageMagnitudeAbilities: 1,
  }),
});

export function resolveBattleStatStageAbilityChangeCanonical({
  pokemon = {},
  delta = 0,
  abilityIgnored = false,
} = {}) {
  const requestedDelta = Number(delta ?? 0);
  if (!Number.isFinite(requestedDelta)) throw new TypeError("battle stat-stage delta must be finite");

  const ability = pokemonAbilityCanonical(pokemon);
  if (abilityIgnored) {
    return Object.freeze({
      ability,
      requestedDelta,
      delta: requestedDelta,
      modified: false,
      source: null,
    });
  }

  if (ability === "CONTRARY") {
    return Object.freeze({
      ability,
      requestedDelta,
      delta: -requestedDelta,
      modified: requestedDelta !== 0,
      source: requestedDelta !== 0 ? "CONTRARY" : null,
    });
  }

  if (ability === "SIMPLE") {
    return Object.freeze({
      ability,
      requestedDelta,
      delta: requestedDelta * 2,
      modified: requestedDelta !== 0,
      source: requestedDelta !== 0 ? "SIMPLE" : null,
    });
  }

  return Object.freeze({
    ability,
    requestedDelta,
    delta: requestedDelta,
    modified: false,
    source: null,
  });
}

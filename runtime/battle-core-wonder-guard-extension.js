const MOLD_BREAKER_ABILITIES = new Set(["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]);

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function pokemonAbilityIdCanonical(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

export const BATTLE_WONDER_GUARD_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["WONDERGUARD"]),
  itemIds: Object.freeze([]),
  abilityCount: 1,
  itemCount: 0,
  classificationCounts: Object.freeze({ typeImmunityAbilities: 1 }),
});

export function resolveWonderGuardTypeImmunityCanonical({
  user = {},
  target = {},
  move = {},
  typeMod = 1,
  moldBreaker = null,
} = {}) {
  const userAbility = pokemonAbilityIdCanonical(user);
  const targetAbility = pokemonAbilityIdCanonical(target);
  const moveId = canonicalId(move?.id);
  const category = String(move?.category ?? "Status").trim().toUpperCase();
  const modifier = Number(typeMod ?? 1);
  if (!Number.isFinite(modifier) || modifier < 0) throw new TypeError("typeMod must be a non-negative finite number");
  const bypass = moldBreaker === null ? MOLD_BREAKER_ABILITIES.has(userAbility) : Boolean(moldBreaker);
  const damagingMove = category !== "STATUS";
  const blocked = targetAbility === "WONDERGUARD"
    && damagingMove
    && moveId !== "STRUGGLE"
    && !bypass
    && modifier > 0
    && modifier <= 1;
  return Object.freeze({
    userAbility,
    targetAbility,
    moveId,
    typeMod: modifier,
    moldBreaker: bypass,
    typeIneffective: blocked,
    source: blocked ? "WONDERGUARD" : null,
  });
}

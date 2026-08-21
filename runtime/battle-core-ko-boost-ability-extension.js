const KO_BOOST_ABILITIES = Object.freeze({
  MOXIE: Object.freeze({ stat: "ATTACK", delta: 1 }),
  CHILLINGNEIGH: Object.freeze({ stat: "ATTACK", delta: 1 }),
  GRIMNEIGH: Object.freeze({ stat: "SPECIAL_ATTACK", delta: 1 }),
  ASONECHILLINGNEIGH: Object.freeze({ stat: "ATTACK", delta: 1 }),
  ASONEGRIMNEIGH: Object.freeze({ stat: "SPECIAL_ATTACK", delta: 1 }),
});

const BEAST_BOOST_STAT_ORDER = Object.freeze([
  "ATTACK",
  "DEFENSE",
  "SPECIAL_ATTACK",
  "SPECIAL_DEFENSE",
  "SPEED",
]);

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function canonicalId(value) {
  const raw = value && typeof value === "object" ? (value.id ?? value.ID ?? value.name) : value;
  return String(raw ?? "").trim().toUpperCase();
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function beastBoostStat(pokemon) {
  const stats = pokemon?.stats ?? {};
  let bestStat = BEAST_BOOST_STAT_ORDER[0];
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const stat of BEAST_BOOST_STAT_ORDER) {
    const value = Number(stats?.[stat] ?? 0);
    const finiteValue = Number.isFinite(value) ? value : 0;
    if (finiteValue > bestValue) {
      bestValue = finiteValue;
      bestStat = stat;
    }
  }
  return bestStat;
}

export const BATTLE_KO_BOOST_ABILITY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([
    "ASONECHILLINGNEIGH",
    "ASONEGRIMNEIGH",
    "BEASTBOOST",
    "CHILLINGNEIGH",
    "GRIMNEIGH",
    "MOXIE",
  ]),
  itemIds: Object.freeze([]),
  abilityCount: 6,
  itemCount: 0,
  classificationCounts: Object.freeze({
    koAttackBoostAbilities: 3,
    koSpecialAttackBoostAbilities: 2,
    koHighestStatBoostAbilities: 1,
  }),
});

export function resolveKoBoostAbilityActionAfterCanonical({ user = {}, context = {} } = {}) {
  const ability = abilityId(user);
  const targetFainted = context?.targetFainted === true || context?.target_fainted === true;
  if (!targetFainted) {
    return Object.freeze({
      ability,
      triggered: false,
      statChanges: Object.freeze([]),
      reason: "target_not_fainted",
    });
  }

  const fixed = KO_BOOST_ABILITIES[ability];
  if (fixed) {
    return Object.freeze({
      ability,
      triggered: true,
      statChanges: Object.freeze([Object.freeze({ subject: "user", stat: fixed.stat, delta: fixed.delta })]),
      reason: "ko_boost_ability",
    });
  }

  if (ability === "BEASTBOOST") {
    return Object.freeze({
      ability,
      triggered: true,
      statChanges: Object.freeze([Object.freeze({ subject: "user", stat: beastBoostStat(user), delta: 1 })]),
      reason: "beast_boost",
    });
  }

  return Object.freeze({
    ability,
    triggered: false,
    statChanges: Object.freeze([]),
    reason: "no_ko_boost_ability",
  });
}

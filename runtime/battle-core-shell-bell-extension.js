function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function heldItemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function integerHp(pokemon, key, fallback = 0) {
  const raw = key === "maxHp" ? (pokemon?.max_hp ?? pokemon?.maxHp) : pokemon?.[key];
  return Math.max(0, Math.trunc(Number(raw ?? fallback)));
}

export function resolveShellBellActionAfterCanonical({ user = {}, damageDealt = 0, context = {} } = {}) {
  const item = heldItemId(user);
  const hp = integerHp(user, "hp");
  const maxHp = integerHp(user, "maxHp");
  const damage = Math.max(0, Math.trunc(Number(damageDealt ?? 0)));
  const sheerForceBoosted = Boolean(context?.sheerForceBoosted ?? context?.sheer_force_boosted);

  if (item !== "SHELLBELL") {
    return Object.freeze({ item, triggered: false, heal: 0, hpDelta: 0, reason: "wrong_item", boundary: "action_after" });
  }
  if (sheerForceBoosted) {
    return Object.freeze({ item, triggered: false, heal: 0, hpDelta: 0, reason: "sheer_force", boundary: "action_after" });
  }
  if (damage <= 0) {
    return Object.freeze({ item, triggered: false, heal: 0, hpDelta: 0, reason: "no_damage", boundary: "action_after" });
  }
  if (hp <= 0 || maxHp <= 0 || hp >= maxHp) {
    return Object.freeze({ item, triggered: false, heal: 0, hpDelta: 0, reason: "cannot_heal", boundary: "action_after" });
  }

  const requested = Math.max(1, Math.floor(damage / 8));
  const heal = Math.min(maxHp - hp, requested);
  return Object.freeze({
    item,
    triggered: heal > 0,
    heal,
    hpDelta: heal,
    damageDealt: damage,
    boundary: "action_after",
    source: "shell_bell",
  });
}

export const BATTLE_SHELL_BELL_COVERAGE_CANONICAL = Object.freeze({
  itemIds: Object.freeze(["SHELLBELL"]),
  itemCount: 1,
  classificationCounts: Object.freeze({
    actionAfterHealingHeldItems: 1,
  }),
});

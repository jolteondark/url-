function canonicalId(value) {
  const raw = value && typeof value === "object"
    ? (value.id ?? value.ID ?? value.name)
    : value;
  return String(raw ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function abilityIdCanonical(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function moveFactCanonical(move, key) {
  if (!move || typeof move !== "object") return "";
  return canonicalId(move[key] ?? move[key.toLowerCase()]);
}

export const BATTLE_HIT_STAT_REACTION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["JUSTIFIED", "STAMINA", "WEAKARMOR"]),
  itemIds: Object.freeze([]),
  abilityCount: 3,
  itemCount: 0,
  classificationCounts: Object.freeze({
    physicalHitStatReactionAbilities: 1,
    anyHitStatReactionAbilities: 1,
    typeHitStatReactionAbilities: 1,
  }),
});

export function resolveHitStatReactionCanonical({
  target = {},
  move = {},
  hit = false,
} = {}) {
  const ability = abilityIdCanonical(target);
  const category = moveFactCanonical(move, "category");
  const type = moveFactCanonical(move, "type");
  const wasHit = Boolean(hit);
  const changes = [];

  if (wasHit && ability === "WEAKARMOR" && category === "PHYSICAL") {
    changes.push(
      Object.freeze({ subject: "target", stat: "DEFENSE", delta: -1 }),
      Object.freeze({ subject: "target", stat: "SPEED", delta: 2 }),
    );
  } else if (wasHit && ability === "STAMINA") {
    changes.push(Object.freeze({ subject: "target", stat: "DEFENSE", delta: 1 }));
  } else if (wasHit && ability === "JUSTIFIED" && type === "DARK") {
    changes.push(Object.freeze({ subject: "target", stat: "ATTACK", delta: 1 }));
  }

  return Object.freeze({
    boundary: "action_after",
    ability,
    hit: wasHit,
    triggered: changes.length > 0,
    statChanges: Object.freeze(changes),
  });
}

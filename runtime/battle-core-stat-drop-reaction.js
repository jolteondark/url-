const MOLD_BREAKER_ABILITIES = new Set(["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]);
const ALL_STAT_DROP_BLOCKING_ABILITIES = new Set(["CLEARBODY", "FULLMETALBODY", "WHITESMOKE"]);
const STAT_SPECIFIC_DROP_BLOCKING_ABILITIES = Object.freeze({
  ATTACK: new Set(["HYPERCUTTER"]),
  DEFENSE: new Set(["BIGPECKS"]),
  ACCURACY: new Set(["KEENEYE"]),
});
const REACTIVE_STAT_DROP_ABILITIES = new Set(["COMPETITIVE", "DEFIANT", "MIRRORARMOR"]);
const STAT_DROP_BLOCKING_ITEMS = new Set(["CLEARAMULET"]);

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function heldItemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function normalizeChange(change) {
  const stat = canonicalId(change?.stat);
  const delta = Math.trunc(Number(change?.delta ?? 0));
  const subject = String(change?.subject ?? "target").toLowerCase();
  if (!stat || !Number.isFinite(delta)) throw new TypeError("stat-stage change requires a stat and finite delta");
  if (!["target", "user"].includes(subject)) throw new RangeError(`unsupported stat-stage subject: ${subject}`);
  return Object.freeze({ subject, stat, delta });
}

function blocksDrop({ targetAbility, targetItem, stat, moldBreaker }) {
  if (STAT_DROP_BLOCKING_ITEMS.has(targetItem)) return true;
  if (moldBreaker) return false;
  if (ALL_STAT_DROP_BLOCKING_ABILITIES.has(targetAbility)) return true;
  return STAT_SPECIFIC_DROP_BLOCKING_ABILITIES[stat]?.has(targetAbility) === true;
}

export function resolveBattleStatDropReactionCanonical({
  source = {},
  target = {},
  changes = [],
  causedByOpponent = true,
  moldBreaker = null,
} = {}) {
  const sourceAbility = abilityId(source);
  const targetAbility = abilityId(target);
  const targetItem = heldItemId(target);
  const bypass = moldBreaker === null ? MOLD_BREAKER_ABILITIES.has(sourceAbility) : Boolean(moldBreaker);
  const normalizedChanges = changes.map(normalizeChange);

  if (!causedByOpponent) {
    return Object.freeze({
      sourceAbility,
      targetAbility,
      targetItem,
      moldBreaker: bypass,
      causedByOpponent: false,
      appliedChanges: Object.freeze(normalizedChanges),
      blockedChanges: Object.freeze([]),
      reactionChanges: Object.freeze([]),
      reason: "not_opponent_caused",
    });
  }

  const appliedChanges = [];
  const blockedChanges = [];
  const reflectedChanges = [];

  for (const change of normalizedChanges) {
    const isOpponentDrop = change.subject === "target" && change.delta < 0;
    if (!isOpponentDrop) {
      appliedChanges.push(change);
      continue;
    }
    if (targetAbility === "MIRRORARMOR" && !bypass) {
      blockedChanges.push(change);
      reflectedChanges.push(Object.freeze({ subject: "user", stat: change.stat, delta: change.delta }));
      continue;
    }
    if (blocksDrop({ targetAbility, targetItem, stat: change.stat, moldBreaker: bypass })) {
      blockedChanges.push(change);
      continue;
    }
    appliedChanges.push(change);
  }

  const loweredStats = [...new Set(appliedChanges
    .filter((change) => change.subject === "target" && change.delta < 0)
    .map((change) => change.stat))];
  const reactionChanges = [...reflectedChanges];
  if (targetAbility === "DEFIANT") {
    for (const _stat of loweredStats) reactionChanges.push(Object.freeze({ subject: "target", stat: "ATTACK", delta: 2 }));
  }
  if (targetAbility === "COMPETITIVE") {
    for (const _stat of loweredStats) reactionChanges.push(Object.freeze({ subject: "target", stat: "SPECIAL_ATTACK", delta: 2 }));
  }

  let reason = "no_stat_drop_reaction";
  if (reflectedChanges.length > 0) reason = "mirror_armor";
  else if (blockedChanges.length > 0) reason = "stat_drop_blocked";
  else if (reactionChanges.length > 0) reason = "stat_drop_reaction";

  return Object.freeze({
    sourceAbility,
    targetAbility,
    targetItem,
    moldBreaker: bypass,
    causedByOpponent: true,
    appliedChanges: Object.freeze(appliedChanges),
    blockedChanges: Object.freeze(blockedChanges),
    reactionChanges: Object.freeze(reactionChanges),
    reason,
  });
}

const BLOCKING_ABILITY_IDS = new Set([
  ...ALL_STAT_DROP_BLOCKING_ABILITIES,
  ...Object.values(STAT_SPECIFIC_DROP_BLOCKING_ABILITIES).flatMap((abilities) => [...abilities]),
]);

export const BATTLE_STAT_DROP_REACTION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([...new Set([...BLOCKING_ABILITY_IDS, ...REACTIVE_STAT_DROP_ABILITIES])].sort()),
  itemIds: Object.freeze([...STAT_DROP_BLOCKING_ITEMS].sort()),
  abilityCount: new Set([...BLOCKING_ABILITY_IDS, ...REACTIVE_STAT_DROP_ABILITIES]).size,
  itemCount: STAT_DROP_BLOCKING_ITEMS.size,
  classificationCounts: Object.freeze({
    allStatDropBlockingAbilities: ALL_STAT_DROP_BLOCKING_ABILITIES.size,
    statSpecificDropBlockingAbilities: BLOCKING_ABILITY_IDS.size - ALL_STAT_DROP_BLOCKING_ABILITIES.size,
    reactiveAbilities: REACTIVE_STAT_DROP_ABILITIES.size,
    statDropBlockingItems: STAT_DROP_BLOCKING_ITEMS.size,
  }),
});

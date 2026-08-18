// Browser-safe canonical source-v0.9.108 type matchup projection.
// Rows are defender-side facts from the existing canonical Type master.
const DEFENSE = Object.freeze({
  NORMAL: Object.freeze({ weak: Object.freeze(["FIGHTING"]), resist: Object.freeze([]), immune: Object.freeze(["GHOST"]) }),
  FIGHTING: Object.freeze({ weak: Object.freeze(["FLYING","PSYCHIC","FAIRY"]), resist: Object.freeze(["ROCK","BUG","DARK"]), immune: Object.freeze([]) }),
  FLYING: Object.freeze({ weak: Object.freeze(["ROCK","ELECTRIC","ICE"]), resist: Object.freeze(["FIGHTING","BUG","GRASS"]), immune: Object.freeze(["GROUND"]) }),
  POISON: Object.freeze({ weak: Object.freeze(["GROUND","PSYCHIC"]), resist: Object.freeze(["FIGHTING","POISON","BUG","GRASS","FAIRY"]), immune: Object.freeze([]) }),
  GROUND: Object.freeze({ weak: Object.freeze(["WATER","GRASS","ICE"]), resist: Object.freeze(["POISON","ROCK"]), immune: Object.freeze(["ELECTRIC"]) }),
  ROCK: Object.freeze({ weak: Object.freeze(["FIGHTING","GROUND","STEEL","WATER","GRASS"]), resist: Object.freeze(["NORMAL","FLYING","POISON","FIRE"]), immune: Object.freeze([]) }),
  BUG: Object.freeze({ weak: Object.freeze(["FLYING","ROCK","FIRE"]), resist: Object.freeze(["FIGHTING","GROUND","GRASS"]), immune: Object.freeze([]) }),
  GHOST: Object.freeze({ weak: Object.freeze(["GHOST","DARK"]), resist: Object.freeze(["POISON","BUG"]), immune: Object.freeze(["NORMAL","FIGHTING"]) }),
  STEEL: Object.freeze({ weak: Object.freeze(["FIGHTING","GROUND","FIRE"]), resist: Object.freeze(["NORMAL","FLYING","ROCK","BUG","STEEL","GRASS","PSYCHIC","ICE","DRAGON","FAIRY"]), immune: Object.freeze(["POISON"]) }),
  FIRE: Object.freeze({ weak: Object.freeze(["GROUND","ROCK","WATER"]), resist: Object.freeze(["BUG","STEEL","FIRE","GRASS","ICE","FAIRY"]), immune: Object.freeze([]) }),
  WATER: Object.freeze({ weak: Object.freeze(["GRASS","ELECTRIC"]), resist: Object.freeze(["STEEL","FIRE","WATER","ICE"]), immune: Object.freeze([]) }),
  GRASS: Object.freeze({ weak: Object.freeze(["FLYING","POISON","BUG","FIRE","ICE"]), resist: Object.freeze(["GROUND","WATER","GRASS","ELECTRIC"]), immune: Object.freeze([]) }),
  ELECTRIC: Object.freeze({ weak: Object.freeze(["GROUND"]), resist: Object.freeze(["FLYING","STEEL","ELECTRIC"]), immune: Object.freeze([]) }),
  PSYCHIC: Object.freeze({ weak: Object.freeze(["BUG","GHOST","DARK"]), resist: Object.freeze(["FIGHTING","PSYCHIC"]), immune: Object.freeze([]) }),
  ICE: Object.freeze({ weak: Object.freeze(["FIGHTING","ROCK","STEEL","FIRE"]), resist: Object.freeze(["ICE"]), immune: Object.freeze([]) }),
  DRAGON: Object.freeze({ weak: Object.freeze(["ICE","DRAGON","FAIRY"]), resist: Object.freeze(["FIRE","WATER","GRASS","ELECTRIC"]), immune: Object.freeze([]) }),
  DARK: Object.freeze({ weak: Object.freeze(["FIGHTING","BUG","FAIRY"]), resist: Object.freeze(["GHOST","DARK"]), immune: Object.freeze(["PSYCHIC"]) }),
  FAIRY: Object.freeze({ weak: Object.freeze(["POISON","STEEL"]), resist: Object.freeze(["FIGHTING","BUG","DARK"]), immune: Object.freeze(["DRAGON"]) }),
});

export const CANONICAL_BATTLE_TYPE_IDS_V108 = Object.freeze(Object.keys(DEFENSE));

function requireType(type, label) {
  const id = String(type ?? "").toUpperCase();
  if (!DEFENSE[id]) throw new RangeError(`unknown canonical ${label} type: ${id || "<empty>"}`);
  return id;
}

export function resolveCanonicalTypeEffectivenessV108(moveType, defenderTypes) {
  const attack = requireType(moveType, "move");
  if (!Array.isArray(defenderTypes) || defenderTypes.length < 1 || defenderTypes.length > 2) {
    throw new TypeError("defenderTypes must contain one or two canonical types");
  }
  let multiplier = 1;
  const perType = [];
  for (const raw of defenderTypes) {
    const defender = requireType(raw, "defender");
    const row = DEFENSE[defender];
    let factor = 1;
    if (row.immune.includes(attack)) factor = 0;
    else if (row.weak.includes(attack)) factor = 2;
    else if (row.resist.includes(attack)) factor = 0.5;
    perType.push(Object.freeze({ defenderType: defender, factor }));
    multiplier *= factor;
  }
  return Object.freeze({
    moveType: attack,
    defenderTypes: Object.freeze(defenderTypes.map((type) => requireType(type, "defender"))),
    multiplier,
    immune: multiplier === 0,
    perType: Object.freeze(perType),
  });
}

export function resolveCanonicalBattleTypingV108(moveType, attackerTypes, defenderTypes) {
  const attack = requireType(moveType, "move");
  if (!Array.isArray(attackerTypes) || attackerTypes.length < 1 || attackerTypes.length > 2) {
    throw new TypeError("attackerTypes must contain one or two canonical types");
  }
  const normalizedAttackerTypes = Object.freeze(attackerTypes.map((type) => requireType(type, "attacker")));
  const effectiveness = resolveCanonicalTypeEffectivenessV108(attack, defenderTypes);
  return Object.freeze({
    ...effectiveness,
    attackerTypes: normalizedAttackerTypes,
    userHasType: normalizedAttackerTypes.includes(attack),
    stabMultiplier: normalizedAttackerTypes.includes(attack) ? 1.5 : 1,
  });
}

export const CANONICAL_TYPE_EFFECTIVENESS_METADATA_V108 = Object.freeze({
  typeCount: CANONICAL_BATTLE_TYPE_IDS_V108.length,
  canonicalFilteredCoreSha256: "e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab",
});
if (CANONICAL_TYPE_EFFECTIVENESS_METADATA_V108.typeCount !== 18) throw new Error("canonical Battle type chart must contain 18 types");

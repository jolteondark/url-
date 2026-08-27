export const HELD_PUNCHING_GLOVE_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Gen9 Pack Battle::ItemEffects::DamageCalcFromUser(:PUNCHINGGLOVE)",
  mechanicsGeneration: 9,
  powerMultiplier: 1.1,
  canonicalMoveSources: Object.freeze([
    "PBS/moves.txt",
    "PBS/moves_zz_Delta_Insurgence.txt",
    "PBS/moves_Gen_9_Pack.txt",
  ]),
});

export const PUNCHING_MOVE_IDS_CANONICAL = Object.freeze([
  "BULLETPUNCH",
  "COMETPUNCH",
  "DIZZYPUNCH",
  "DOUBLEIRONBASH",
  "DRAINPUNCH",
  "DYNAMICPUNCH",
  "FIREPUNCH",
  "FOCUSPUNCH",
  "HAMMERARM",
  "HEADLONGRUSH",
  "ICEHAMMER",
  "ICEPUNCH",
  "JETPUNCH",
  "MACHPUNCH",
  "MEGAPUNCH",
  "METEORMASH",
  "PLASMAFISTS",
  "POWERUPPUNCH",
  "RAGEFIST",
  "SHADOWPUNCH",
  "SKYUPPERCUT",
  "SURGINGSTRIKES",
  "THUNDERPUNCH",
  "WICKEDBLOW",
]);

const PUNCHING_MOVE_ID_SET_CANONICAL = new Set(PUNCHING_MOVE_IDS_CANONICAL);

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function abilityId(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "ability")) return id(pokemon.ability);
  return id(pokemon?.ability_id);
}

function rawHeldItemId(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "held_item")) return id(pokemon.held_item);
  return id(pokemon?.item);
}

export function heldPunchingGloveItemIdCanonical(pokemon = {}) {
  if (pokemon?.held_item_effect_suppressed === true || abilityId(pokemon) === "KLUTZ") return null;
  return rawHeldItemId(pokemon) === "PUNCHINGGLOVE" ? "PUNCHINGGLOVE" : null;
}

function flagListCanonical(rawFlags) {
  if (Array.isArray(rawFlags)) return rawFlags.map(id).filter(Boolean);
  if (typeof rawFlags === "string") return rawFlags.split(/[\s,;|]+/u).map(id).filter(Boolean);
  if (rawFlags && typeof rawFlags === "object") {
    return Object.entries(rawFlags)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([flag]) => id(flag))
      .filter(Boolean);
  }
  return [];
}

export function moveIsPunchingCanonical(move = {}) {
  const moveId = id(move?.id ?? move?.move_id ?? move?.moveId);
  if (PUNCHING_MOVE_ID_SET_CANONICAL.has(moveId)) return true;
  const rawFlags = move?.flags ?? move?.Flags ?? move?.moveFlags ?? move?.move_flags;
  return flagListCanonical(rawFlags).includes("PUNCHING");
}

export function resolveHeldPunchingGlovePowerCanonical({ user = {}, move = {} } = {}) {
  const item = heldPunchingGloveItemIdCanonical(user);
  const moveId = id(move?.id ?? move?.move_id ?? move?.moveId);
  const punching = moveIsPunchingCanonical(move);
  const triggered = item === "PUNCHINGGLOVE" && punching;
  return Object.freeze({
    boundary: "action_before",
    item,
    moveId,
    punching,
    triggered,
    powerMultiplier: triggered ? HELD_PUNCHING_GLOVE_SOURCE_CANONICAL.powerMultiplier : 1,
  });
}

export const BATTLE_PUNCHING_GLOVE_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: Object.freeze(["PUNCHINGGLOVE"]),
  abilityCount: 0,
  itemCount: 1,
  classificationCounts: Object.freeze({
    punchingMovePowerHeldItems: 1,
    canonicalPunchingMoves: PUNCHING_MOVE_IDS_CANONICAL.length,
  }),
});

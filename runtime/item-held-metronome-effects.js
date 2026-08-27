export const HELD_METRONOME_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Battler_UseMove + Battle::ItemEffects::DamageCalcFromUser(:METRONOME)",
  mechanicsGeneration: 9,
  itemId: "METRONOME",
  step: 0.2,
  maxCounter: 5,
  maxFinalDamageMultiplier: 2,
});

export const METRONOME_CALLS_ANOTHER_MOVE_FUNCTION_CODES_CANONICAL = Object.freeze([
  "UseLastMoveUsed",
  "UseLastMoveUsedByTarget",
  "UseMoveTargetIsAboutToUse",
  "UseMoveDependingOnEnvironment",
  "UseRandomMove",
  "UseRandomMoveFromUserParty",
  "UseRandomUserMoveIfAsleep",
]);

const CALLS_ANOTHER_MOVE = new Set(METRONOME_CALLS_ANOTHER_MOVE_FUNCTION_CODES_CANONICAL);

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

function clampCounter(value) {
  const counter = Number(value ?? 0);
  if (!Number.isFinite(counter)) return 0;
  return Math.min(HELD_METRONOME_SOURCE_CANONICAL.maxCounter, Math.max(0, Math.trunc(counter)));
}

function moveIdCanonical(move) {
  return id(move?.id ?? move?.moveId ?? move);
}

function functionCodeCanonical(move) {
  return String(move?.function_code ?? move?.functionCode ?? "").trim();
}

export function heldMetronomeItemIdCanonical(pokemon = {}) {
  if (pokemon?.held_item_effect_suppressed === true || abilityId(pokemon) === "KLUTZ") return null;
  const item = rawHeldItemId(pokemon);
  return item === HELD_METRONOME_SOURCE_CANONICAL.itemId ? item : null;
}

export function metronomeMoveCallsAnotherMoveCanonical(move = {}) {
  if (move?.callsAnotherMove === true || move?.calls_another_move === true || move?.calls_another_move_q === true) return true;
  return CALLS_ANOTHER_MOVE.has(functionCodeCanonical(move));
}

export function resolveHeldMetronomePowerCanonical({ user = {}, move = {} } = {}) {
  const item = heldMetronomeItemIdCanonical(user);
  const previousCounter = clampCounter(user?.__battle_metronome_counter);
  const previousMoveId = id(user?.__battle_metronome_last_move_id);
  const previousMoveFailed = Boolean(user?.__battle_metronome_last_move_failed);
  const currentMoveId = moveIdCanonical(move);
  const callsAnotherMove = metronomeMoveCallsAnotherMoveCanonical(move);
  let counter = previousCounter;
  if (item && !callsAnotherMove) {
    counter = previousMoveId && previousMoveId === currentMoveId && !previousMoveFailed
      ? Math.min(HELD_METRONOME_SOURCE_CANONICAL.maxCounter, previousCounter + 1)
      : 0;
  }
  const finalDamageMultiplier = item
    ? 1 + (HELD_METRONOME_SOURCE_CANONICAL.step * counter)
    : 1;
  return Object.freeze({
    boundary: "action_before",
    item,
    currentMoveId: currentMoveId || null,
    previousMoveId: previousMoveId || null,
    previousMoveFailed,
    previousCounter,
    counter,
    callsAnotherMove,
    triggered: Boolean(item),
    finalDamageMultiplier,
  });
}

const SIDE_KEYS = Object.freeze({
  player: Object.freeze({
    counter: "player_metronome_counter",
    lastMove: "player_metronome_last_move_id",
    failed: "player_metronome_last_move_failed",
  }),
  foe: Object.freeze({
    counter: "foe_metronome_counter",
    lastMove: "foe_metronome_last_move_id",
    failed: "foe_metronome_last_move_failed",
  }),
});

function sideKeys(side) {
  const keys = SIDE_KEYS[String(side ?? "").toLowerCase()];
  if (!keys) throw new RangeError("metronome battle side must be player or foe");
  return keys;
}

export function injectMetronomeBattleStateCanonical(pokemon, battle, side) {
  if (!pokemon || typeof pokemon !== "object") return pokemon;
  const keys = sideKeys(side);
  pokemon.__battle_metronome_counter = clampCounter(battle?.[keys.counter]);
  pokemon.__battle_metronome_last_move_id = battle?.[keys.lastMove] ?? null;
  pokemon.__battle_metronome_last_move_failed = Boolean(battle?.[keys.failed]);
  return pokemon;
}

export function clearMetronomePokemonTransientCanonical(pokemon) {
  if (!pokemon || typeof pokemon !== "object") return pokemon;
  delete pokemon.__battle_metronome_counter;
  delete pokemon.__battle_metronome_last_move_id;
  delete pokemon.__battle_metronome_last_move_failed;
  return pokemon;
}

function resolvedActionCanonical(resolved, battlerIndex) {
  const rounds = resolved?.battleRuntimeIntegration?.combatTrace?.rounds
    ?? resolved?.combatTrace?.rounds
    ?? resolved?.trace?.rounds
    ?? [];
  for (const round of rounds) {
    const actions = Array.isArray(round?.actions) ? round.actions : [];
    const exact = actions.find((action) => Number(action?.battlerIndex) === Number(battlerIndex));
    if (exact) return exact;
  }
  return null;
}

export function updateMetronomeBattleStateAfterResolvedRoundCanonical({
  battle,
  side,
  pokemonBefore = {},
  resolved,
  battlerIndex,
  usedMove = true,
} = {}) {
  if (!battle || typeof battle !== "object") throw new TypeError("battle state is required");
  const keys = sideKeys(side);
  if (!usedMove) return Object.freeze({ updated: false, reason: "no_move_action" });
  const action = resolvedActionCanonical(resolved, battlerIndex);
  if (!action || !action.moveId) return Object.freeze({ updated: false, reason: "no_resolved_move" });

  const move = { id: action.moveId, function_code: action.functionCode };
  const resolution = resolveHeldMetronomePowerCanonical({ user: pokemonBefore, move });
  battle[keys.counter] = resolution.counter;
  battle[keys.lastMove] = id(action.moveId) || null;
  battle[keys.failed] = Boolean(action.moveSkipped || action.lastMoveFailed);
  return Object.freeze({
    updated: true,
    counter: battle[keys.counter],
    lastMoveId: battle[keys.lastMove],
    lastMoveFailed: battle[keys.failed],
    callsAnotherMove: resolution.callsAnotherMove,
  });
}

export function clearMetronomeBattleStateCanonical(battle, side) {
  if (!battle || typeof battle !== "object") return battle;
  const keys = sideKeys(side);
  battle[keys.counter] = 0;
  battle[keys.lastMove] = null;
  battle[keys.failed] = false;
  return battle;
}

export const BATTLE_METRONOME_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: Object.freeze(["METRONOME"]),
  abilityCount: 0,
  itemCount: 1,
  classificationCounts: Object.freeze({ consecutiveMoveFinalDamageHeldItems: 1 }),
});

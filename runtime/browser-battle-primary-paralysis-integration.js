import { inflictStatus } from "./battle-status-pp-flow.js";
import { safariGeneralPokemonTypesV108 } from "./safari-general-species-type-facts.js";

const CAN_INFLICT_STATUS_BODY_SHA256 = "11ffc58596d2af99bce2e088c0685d6e28db93922889d95348d37766cc340473";
const INFLICT_STATUS_BODY_SHA256 = "6437ace3c6b38a78ee12e1acdbfd365c82959ea87e322a305c1bd71e3ebaeb33";
const PRIMARY_PARALYSIS_FUNCTION_CODES = new Set([
  "ParalyzeTarget",
  "ParalyzeTargetIfNotTypeImmune",
]);

function pokemonTypes(pokemon) {
  if (Array.isArray(pokemon?.types) && pokemon.types.length >= 1 && pokemon.types.length <= 2) {
    return pokemon.types.map((type) => String(type).toUpperCase());
  }
  try {
    return safariGeneralPokemonTypesV108(pokemon).map((type) => String(type).toUpperCase());
  } catch (error) {
    if (error instanceof RangeError) return [];
    throw error;
  }
}

export function canInflictPrimaryParalysisCanonical(target = {}, { moreTypeEffects = true } = {}) {
  if (Number(target?.hp ?? 0) <= 0) {
    return { allowed: false, reason: "fainted", sourceSymbol: "Battle::Battler#pbCanInflictStatus?", sourceBodySha256: CAN_INFLICT_STATUS_BODY_SHA256 };
  }
  const currentStatus = String(target?.status ?? "NONE").toUpperCase();
  if (currentStatus !== "NONE") {
    return { allowed: false, reason: "already_statused", sourceSymbol: "Battle::Battler#pbCanInflictStatus?", sourceBodySha256: CAN_INFLICT_STATUS_BODY_SHA256 };
  }
  if (Boolean(target?.behind_substitute ?? target?.behindSubstitute)) {
    return { allowed: false, reason: "substitute", sourceSymbol: "Battle::Battler#pbCanInflictStatus?", sourceBodySha256: CAN_INFLICT_STATUS_BODY_SHA256 };
  }
  if (Boolean(target?.status_immunity?.PARALYSIS ?? target?.statusImmunity?.PARALYSIS)) {
    return { allowed: false, reason: "resolved_immunity", sourceSymbol: "Battle::Battler#pbCanInflictStatus?", sourceBodySha256: CAN_INFLICT_STATUS_BODY_SHA256 };
  }
  if (moreTypeEffects && pokemonTypes(target).includes("ELECTRIC")) {
    return { allowed: false, reason: "electric_type", sourceSymbol: "Battle::Battler#pbCanInflictStatus?", sourceBodySha256: CAN_INFLICT_STATUS_BODY_SHA256 };
  }
  return { allowed: true, reason: "allowed", sourceSymbol: "Battle::Battler#pbCanInflictStatus?", sourceBodySha256: CAN_INFLICT_STATUS_BODY_SHA256 };
}

export function resolvePrimaryParalysisStatusCanonical({ target, move, accuracyHit } = {}) {
  const functionCode = move?.secondary_function_code ?? move?.secondaryFunctionCode ?? null;
  if (move?.category !== "Status" || !PRIMARY_PARALYSIS_FUNCTION_CODES.has(functionCode)) {
    return { applied: false, pokemon: structuredClone(target), reason: "not_primary_paralysis" };
  }
  if (accuracyHit !== true) {
    return { applied: false, pokemon: structuredClone(target), reason: "missed" };
  }
  const eligibility = canInflictPrimaryParalysisCanonical(target);
  if (!eligibility.allowed) {
    return { applied: false, pokemon: structuredClone(target), reason: eligibility.reason, eligibility };
  }
  const flow = inflictStatus({
    currentState: {
      status: target?.status ?? "NONE",
      statusCount: Number(target?.status_count ?? 0),
      toxic: Number(target?.toxic ?? 0),
      outrage: Number(target?.outrage ?? 0),
      currentMove: target?.current_move ?? null,
      abilityActive: false,
      itemActive: false,
    },
    newStatus: "PARALYSIS",
    newStatusCount: 0,
  });
  return {
    applied: true,
    reason: "inflicted",
    pokemon: {
      ...structuredClone(target),
      status: flow.state.status,
      status_count: Number(flow.state.statusCount ?? 0),
    },
    operations: structuredClone(flow.operations ?? []),
    eligibility,
    sourceSymbol: "Battle::Battler#pbInflictStatus",
    sourceBodySha256: INFLICT_STATUS_BODY_SHA256,
  };
}

function activeIndexFromHandoff(handoff, side) {
  return Number(side === "player" ? handoff?.playerActivePartyIndex ?? 0 : handoff?.foeActivePartyIndex ?? 0);
}

function replaceActivePartyPokemon(party, activeIndex, pokemon) {
  if (!Array.isArray(party)) return party;
  const next = structuredClone(party);
  if (activeIndex >= 0 && activeIndex < next.length) next[activeIndex] = structuredClone(pokemon);
  return next;
}

function reflectPokemon(result, battlerIndex, pokemon) {
  if (battlerIndex === 0) result.player = structuredClone(pokemon);
  else result.foe = structuredClone(pokemon);

  const handoff = result.battleContinuationHandoff;
  if (handoff && typeof handoff === "object") {
    if (battlerIndex === 0) {
      handoff.playerParty = replaceActivePartyPokemon(handoff.playerParty, activeIndexFromHandoff(handoff, "player"), pokemon);
    } else {
      handoff.foeParty = replaceActivePartyPokemon(handoff.foeParty, activeIndexFromHandoff(handoff, "foe"), pokemon);
    }
  }

  const next = result.nextRoundState;
  if (next && typeof next === "object") {
    if (battlerIndex === 0) {
      next.player = structuredClone(pokemon);
      next.playerParty = replaceActivePartyPokemon(next.playerParty, Number(next.playerActivePartyIndex ?? 0), pokemon);
    } else {
      next.foe = structuredClone(pokemon);
      next.foeParty = replaceActivePartyPokemon(next.foeParty, Number(next.foeActivePartyIndex ?? 0), pokemon);
    }
  }
}

export function applyResolvedPrimaryParalysisCanonical(resolved = {}, moveMasters = {}) {
  const result = structuredClone(resolved);
  const actions = result?.battleRuntimeIntegration?.combatTrace?.rounds?.[0]?.actions ?? [];
  const applied = [];
  for (const action of actions) {
    if (!action || action.kind !== "move" || action.moveSkipped) continue;
    const targetIndex = Number(action.targetBattlerIndex ?? -1);
    if (targetIndex !== 0 && targetIndex !== 1) continue;
    const move = moveMasters?.[action.moveId];
    if (!move) continue;
    const target = targetIndex === 0 ? result.player : result.foe;
    const status = resolvePrimaryParalysisStatusCanonical({ target, move, accuracyHit: action.accuracyHit });
    if (!status.applied) continue;
    reflectPokemon(result, targetIndex, status.pokemon);
    applied.push({ actionBattlerIndex: Number(action.battlerIndex ?? -1), targetBattlerIndex: targetIndex, moveId: action.moveId, status: "PARALYSIS", operations: status.operations ?? [] });
  }
  result.primaryStatusIntegration = { commits: applied };
  return result;
}

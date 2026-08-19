function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function activePokemon(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  const index = Number(battle.player_party_index ?? 0);
  const pokemon = runtime?.player?.party?.[index];
  if (!pokemon) throw new Error("active player Pokemon is required");
  return pokemon;
}

export function setSafariBattleMoveLearningDecision(runtime, { level, moveId, forgetIndex = null, decline = false } = {}) {
  const pokemon = activePokemon(runtime);
  const normalizedLevel = Number(level);
  const normalizedMove = String(moveId ?? "");
  if (!Number.isInteger(normalizedLevel) || normalizedLevel < 1 || normalizedLevel > 100) throw new RangeError("level must be an integer from 1 to 100");
  if (!normalizedMove) throw new TypeError("moveId is required");
  let decision;
  if (decline) decision = { decline: true };
  else {
    const index = Number(forgetIndex);
    if (!Number.isInteger(index) || index < 0 || index > 3) throw new RangeError("forgetIndex must be an integer from 0 to 3");
    decision = { forgetIndex: index };
  }
  const decisions = pokemon.__battle_move_decisions && typeof pokemon.__battle_move_decisions === "object"
    ? pokemon.__battle_move_decisions
    : {};
  pokemon.__battle_move_decisions = { ...decisions, [`${normalizedLevel}:${normalizedMove}`]: decision };
  return { level: normalizedLevel, moveId: normalizedMove, decision: structuredClone(decision) };
}

export function clearSafariBattleMoveLearningDecisions(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "__battle_move_decisions")) delete pokemon.__battle_move_decisions;
  return pokemon;
}

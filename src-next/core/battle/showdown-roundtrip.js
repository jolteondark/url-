import { cloneGameState } from '../game-state.js';

const PERSISTENT_FIELDS = Object.freeze(['hp', 'status', 'moves', 'heldItem']);
const TRANSIENT_FIELDS = Object.freeze(['volatile', 'volatiles', 'statStages', 'boosts', 'battleFlags']);
const BATTLE_SYNC_IDS = 'appliedBattleStateResultIds';

function cloneMoves(moves = []) {
  return moves.map((move) => ({
    id: String(move.id),
    pp: Number(move.pp),
    maxpp: Number(move.maxpp ?? move.maxPP ?? move.pp),
  }));
}

export function projectMaplessPokemonToShowdown(member) {
  if (!member?.species) throw new Error('Battle projection requires species');
  return Object.freeze({
    maplessId: String(member.id ?? member.personalId ?? member.species),
    species: String(member.species),
    name: String(member.name ?? member.species),
    level: Number(member.level ?? 1),
    hp: Number(member.hp),
    maxhp: Number(member.maxhp ?? member.maxHp),
    status: member.status ? String(member.status) : '',
    heldItem: member.heldItem ? String(member.heldItem) : '',
    moves: cloneMoves(member.moves),
  });
}

export function projectMaplessPartyToShowdown(party = []) {
  return party.map(projectMaplessPokemonToShowdown);
}

export function createShowdownBattleSnapshot(state, { battleId }) {
  if (!battleId) throw new Error('battleId is required');
  return Object.freeze({
    battleId: String(battleId),
    party: projectMaplessPartyToShowdown(state.party),
  });
}

function persistentPatch(resolved) {
  return {
    hp: Number(resolved.hp),
    status: resolved.status ? String(resolved.status) : '',
    moves: cloneMoves(resolved.moves),
    heldItem: resolved.heldItem ? String(resolved.heldItem) : '',
  };
}

function clearTransientBattleState(member) {
  const clean = { ...member };
  for (const field of TRANSIENT_FIELDS) delete clean[field];
  return clean;
}

// Commits only persistent battle state. The Core terminal lifecycle remains owned by
// step(... BATTLE_TERMINAL_RESULT), so this uses a distinct idempotency namespace.
export function commitShowdownTerminalResult(state, result) {
  if (!result?.terminal) throw new Error('Only terminal Showdown results may commit to Mapless state');
  if (!result.resultId) throw new Error('Terminal Showdown result requires resultId');
  const resultId = String(result.resultId);
  const applied = state.diagnostics?.[BATTLE_SYNC_IDS] ?? [];
  if (applied.includes(resultId)) {
    return { state, committed: false, duplicate: true };
  }

  const next = cloneGameState(state);
  const byId = new Map((result.party ?? []).map((member) => [String(member.maplessId), member]));
  next.party = next.party.map((member) => {
    const clean = clearTransientBattleState(member);
    const id = String(member.id ?? member.personalId ?? member.species);
    const resolved = byId.get(id);
    return resolved ? { ...clean, ...persistentPatch(resolved) } : clean;
  });
  next.diagnostics ??= {};
  next.diagnostics[BATTLE_SYNC_IDS] ??= [];
  next.diagnostics[BATTLE_SYNC_IDS].push(resultId);
  return { state: next, committed: true, duplicate: false };
}

export function getShowdownPersistentFields() {
  return PERSISTENT_FIELDS.slice();
}

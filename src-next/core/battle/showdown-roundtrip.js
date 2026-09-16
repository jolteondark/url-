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

function stableMaplessId(member, context = 'Battle round-trip') {
  const raw = member?.maplessId ?? member?.id ?? member?.personalId;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    throw new Error(`${context} requires a stable Mapless Pokémon ID`);
  }
  return String(raw);
}

function assertUniqueStableIds(members = [], context) {
  const seen = new Set();
  for (const member of members) {
    const id = stableMaplessId(member, context);
    if (seen.has(id)) throw new Error(`${context} contains duplicate stable Mapless Pokémon ID: ${id}`);
    seen.add(id);
  }
}

export function projectMaplessPokemonToShowdown(member) {
  if (!member?.species) throw new Error('Battle projection requires species');
  return Object.freeze({
    maplessId: stableMaplessId(member, 'Battle projection'),
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
  assertUniqueStableIds(party, 'Battle projection party');
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

  assertUniqueStableIds(state.party, 'Mapless party commit source');
  assertUniqueStableIds(result.party, 'Showdown resolved party');
  const byId = new Map((result.party ?? []).map((member) => [stableMaplessId(member, 'Showdown resolved party'), member]));
  for (const member of state.party ?? []) {
    const id = stableMaplessId(member, 'Mapless party commit source');
    if (!byId.has(id)) throw new Error(`Showdown resolved party is missing stable Mapless Pokémon ID: ${id}`);
  }

  const next = cloneGameState(state);
  next.party = next.party.map((member) => {
    const clean = clearTransientBattleState(member);
    const id = stableMaplessId(member, 'Mapless party commit source');
    return { ...clean, ...persistentPatch(byId.get(id)) };
  });
  next.diagnostics ??= {};
  next.diagnostics[BATTLE_SYNC_IDS] ??= [];
  next.diagnostics[BATTLE_SYNC_IDS].push(resultId);
  return { state: next, committed: true, duplicate: false };
}

export function getShowdownPersistentFields() {
  return PERSISTENT_FIELDS.slice();
}

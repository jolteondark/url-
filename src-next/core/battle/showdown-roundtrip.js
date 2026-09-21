import { cloneGameState } from '../game-state.js';

const PERSISTENT_FIELDS = Object.freeze(['hp', 'status', 'statusTurns', 'moves', 'heldItem']);
const TRANSIENT_FIELDS = Object.freeze(['volatile', 'volatiles', 'statStages', 'boosts', 'battleFlags']);
const BATTLE_SYNC_IDS = 'appliedBattleStateResultIds';
const PERSISTENT_MAJOR_STATUSES = new Set(['', 'brn', 'frz', 'par', 'psn', 'slp', 'tox']);

function cloneMoves(moves = []) {
  return moves.map((move) => ({
    id: String(move.id),
    pp: Number(move.pp),
    maxpp: Number(move.maxpp ?? move.maxPP ?? move.pp),
  }));
}

function normalizeId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function moveId(move) {
  return normalizeId(move?.id ?? move?.move ?? move);
}

function exactSleepTurns(value, boundary) {
  const turns = Number(value);
  if (!Number.isInteger(turns) || turns < 1) {
    throw new Error(`${boundary} sleep projection requires a positive integer statusTurns`);
  }
  return turns;
}

function exactNonnegativeInteger(value, boundary) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${boundary} requires a non-negative integer`);
  return number;
}

function exactTerminalStatus(value) {
  const status = value ? String(value).toLowerCase() : '';
  if (!PERSISTENT_MAJOR_STATUSES.has(status)) {
    throw new Error(`Terminal status commit requires a canonical Showdown major status: ${status || '<empty>'}`);
  }
  return status;
}

function exactTerminalItem(value) {
  const item = value ? String(value) : '';
  const canonical = normalizeId(item);
  if (item && item !== canonical) {
    throw new Error(`Terminal held-item commit requires a canonical Showdown item id: ${item}`);
  }
  return canonical;
}

export function projectMaplessPokemonToShowdown(member) {
  if (!member?.species) throw new Error('Battle projection requires species');
  const projected = {
    maplessId: String(member.id ?? member.personalId ?? member.species),
    species: String(member.species),
    name: String(member.name ?? member.species),
    level: Number(member.level ?? 1),
    hp: Number(member.hp),
    maxhp: Number(member.maxhp ?? member.maxHp),
    status: member.status ? String(member.status) : '',
    heldItem: member.heldItem ? String(member.heldItem) : '',
    moves: cloneMoves(member.moves),
  };
  if (projected.status.toLowerCase() === 'slp') {
    projected.statusTurns = exactSleepTurns(member.statusTurns, 'Persistent');
  }
  return Object.freeze(projected);
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

function mergeResolvedMovePp(sourceMoves = [], resolvedMoves = []) {
  if (resolvedMoves.length !== sourceMoves.length) {
    throw new Error('Terminal PP commit requires one resolved Showdown move per Mapless move');
  }
  const resolvedById = new Map();
  for (const move of resolvedMoves) {
    const id = moveId(move);
    if (!id) throw new Error('Terminal PP commit requires a stable resolved move id');
    if (resolvedById.has(id)) throw new Error(`Duplicate resolved Showdown move id during terminal PP commit: ${id}`);
    const pp = exactNonnegativeInteger(move?.pp, `Terminal PP commit for ${id}`);
    resolvedById.set(id, { move, pp });
  }
  const sourceIds = new Set();
  return sourceMoves.map((move) => {
    const id = moveId(move);
    if (!id) throw new Error('Terminal PP commit requires a stable Mapless move id');
    if (sourceIds.has(id)) throw new Error(`Duplicate Mapless move id during terminal PP commit: ${id}`);
    sourceIds.add(id);
    const resolved = resolvedById.get(id);
    if (!resolved) throw new Error(`Terminal PP commit could not match resolved Showdown move: ${id}`);
    const sourceMaxpp = exactNonnegativeInteger(move?.maxpp ?? move?.maxPP ?? move?.pp, `Mapless max PP for ${id}`);
    if (resolved.pp > sourceMaxpp) throw new Error(`Terminal PP commit is outside Mapless bounds for ${id}: ${resolved.pp}/${sourceMaxpp}`);
    return { ...move, pp: resolved.pp };
  });
}

function persistentPatch(source, resolved) {
  const hp = exactNonnegativeInteger(resolved.hp, 'Terminal HP commit');
  const maxhp = exactNonnegativeInteger(resolved.maxhp ?? resolved.maxHp, 'Terminal max HP observation');
  if (maxhp < 1 || hp > maxhp) throw new Error(`Terminal HP commit is outside Showdown bounds: ${hp}/${maxhp}`);
  const status = exactTerminalStatus(resolved.status);
  const heldItem = exactTerminalItem(resolved.heldItem);
  const patch = {
    hp,
    status,
    // Showdown owns current PP during battle, but its move-slot maxpp is derived
    // from simulator defaults. Keep Mapless move metadata/maxpp and only commit
    // the authoritative current PP by stable move id.
    moves: mergeResolvedMovePp(source.moves, resolved.moves),
    heldItem,
  };
  if (status === 'slp') {
    patch.statusTurns = exactSleepTurns(resolved.statusTurns, 'Terminal');
  } else {
    patch.statusTurns = undefined;
  }
  return patch;
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
    if (!resolved) return clean;
    const patch = persistentPatch(clean, resolved);
    const committed = { ...clean, ...patch };
    if (patch.statusTurns === undefined) delete committed.statusTurns;
    return committed;
  });
  next.diagnostics ??= {};
  next.diagnostics[BATTLE_SYNC_IDS] ??= [];
  next.diagnostics[BATTLE_SYNC_IDS].push(resultId);
  return { state: next, committed: true, duplicate: false };
}

export function getShowdownPersistentFields() {
  return PERSISTENT_FIELDS.slice();
}

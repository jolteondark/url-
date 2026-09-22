import { cloneGameState } from '../game-state.js';

const PERSISTENT_FIELDS = Object.freeze(['hp', 'status', 'statusTurns', 'moves', 'heldItem', 'fainted']);
const TRANSIENT_FIELDS = Object.freeze(['volatile', 'volatiles', 'statStages', 'boosts', 'battleFlags']);
const BATTLE_SYNC_IDS = 'appliedBattleStateResultIds';
const PERSISTENT_MAJOR_STATUSES = new Set(['', 'brn', 'frz', 'par', 'psn', 'slp', 'tox']);

function normalizeId(value) { return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function moveId(move) { return normalizeId(move?.id ?? move?.move ?? move); }
function exactSleepTurns(value, boundary) {
  const turns = Number(value);
  if (!Number.isInteger(turns) || turns < 1) throw new Error(`${boundary} sleep projection requires a positive integer statusTurns`);
  return turns;
}
function exactNonnegativeInteger(value, boundary) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${boundary} requires a non-negative integer`);
  return number;
}
function exactStartingStatus(value) {
  const status = value === undefined || value === null ? '' : String(value);
  if (!PERSISTENT_MAJOR_STATUSES.has(status)) throw new Error(`Battle projection status requires a canonical Showdown major status: ${status || '<empty>'}`);
  return status;
}
function exactStartingItem(value) {
  const item = value === undefined || value === null ? '' : String(value);
  const canonical = normalizeId(item);
  if (item && item !== canonical) throw new Error(`Battle projection held item requires a canonical Showdown item id: ${item}`);
  return canonical;
}
function exactStartingMoves(moves = []) {
  if (!Array.isArray(moves)) throw new Error('Battle projection moves require an array');
  const ids = new Set();
  return moves.map((move) => {
    const id = moveId(move);
    if (!id) throw new Error('Battle projection move requires a stable move id');
    if (ids.has(id)) throw new Error(`Battle projection requires unique move ids: ${id}`);
    ids.add(id);
    const pp = exactNonnegativeInteger(move?.pp, `Battle projection PP for ${id}`);
    const maxpp = exactNonnegativeInteger(move?.maxpp ?? move?.maxPP, `Battle projection max PP for ${id}`);
    if (maxpp < 1) throw new Error(`Battle projection max PP requires a positive integer for ${id}`);
    if (pp > maxpp) throw new Error(`Battle projection PP is outside persistent bounds for ${id}: ${pp}/${maxpp}`);
    return { id: String(move.id), pp, maxpp };
  });
}
function exactStartingLevel(value) {
  const level = Number(value ?? 1);
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new Error('Battle projection level requires an integer from 1 through 100');
  return level;
}
function exactStartingMaxHp(value, hp) {
  const maxhp = Number(value);
  if (!Number.isInteger(maxhp) || maxhp < 1) throw new Error('Battle projection max HP requires a positive integer');
  if (hp > maxhp) throw new Error(`Battle projection HP is outside persistent max HP bounds: ${hp}/${maxhp}`);
  return maxhp;
}
function exactStartingFainted(value, hp) {
  const expected = hp === 0;
  if (value === undefined) return expected;
  if (typeof value !== 'boolean') throw new Error('Battle projection faint state requires an exact boolean when persisted');
  if (value !== expected) throw new Error(`Battle projection faint state is inconsistent with persistent HP: ${value}/${hp}`);
  return value;
}
function exactTerminalStatus(value) {
  const status = value ? String(value).toLowerCase() : '';
  if (!PERSISTENT_MAJOR_STATUSES.has(status)) throw new Error(`Terminal status commit requires a canonical Showdown major status: ${status || '<empty>'}`);
  return status;
}
function exactTerminalItem(value) {
  const item = value ? String(value) : '';
  const canonical = normalizeId(item);
  if (item && item !== canonical) throw new Error(`Terminal held-item commit requires a canonical Showdown item id: ${item}`);
  return canonical;
}
function exactTerminalFainted(value, hp) {
  if (typeof value !== 'boolean') throw new Error('Terminal faint state commit requires an exact boolean');
  const expected = hp === 0;
  if (value !== expected) throw new Error(`Terminal faint state is inconsistent with Showdown HP: ${value}/${hp}`);
  return value;
}
function persistentMemberId(member, boundary = 'Terminal party commit') {
  const raw = member?.id ?? member?.personalId;
  if (raw === undefined || raw === null || String(raw) === '') throw new Error(`${boundary} requires a stable persistent Mapless member id`);
  return String(raw);
}

export function projectMaplessPokemonToShowdown(member) {
  if (!member?.species) throw new Error('Battle projection requires species');
  const hp = exactNonnegativeInteger(member.hp, 'Battle projection HP');
  const level = exactStartingLevel(member.level);
  const maxhp = exactStartingMaxHp(member.maxhp ?? member.maxHp, hp);
  const status = exactStartingStatus(member.status);
  const heldItem = exactStartingItem(member.heldItem);
  const projected = {
    maplessId: persistentMemberId(member, 'Battle projection'), species: String(member.species), name: String(member.name ?? member.species),
    level, hp, maxhp, status, heldItem, moves: exactStartingMoves(member.moves), fainted: exactStartingFainted(member.fainted, hp),
  };
  if (member.ability !== undefined && member.ability !== null && String(member.ability) !== '') projected.ability = String(member.ability);
  if (projected.status === 'slp') projected.statusTurns = exactSleepTurns(member.statusTurns, 'Persistent');
  return Object.freeze(projected);
}
export function projectMaplessPartyToShowdown(party = []) {
  const projected = party.map(projectMaplessPokemonToShowdown);
  const ids = new Set();
  for (const member of projected) {
    if (ids.has(member.maplessId)) throw new Error(`Battle projection requires unique persistent Mapless member ids: ${member.maplessId}`);
    ids.add(member.maplessId);
  }
  return projected;
}
export function createShowdownBattleSnapshot(state, { battleId }) {
  if (!battleId) throw new Error('battleId is required');
  return Object.freeze({ battleId: String(battleId), party: projectMaplessPartyToShowdown(state.party) });
}

function mergeResolvedMovePp(sourceMoves = [], resolvedMoves = []) {
  if (resolvedMoves.length !== sourceMoves.length) throw new Error('Terminal PP commit requires one resolved Showdown move per Mapless move');
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
  const maxhp = exactNonnegativeInteger(resolved.maxhp ?? resolved.maxHp ?? source.maxhp ?? source.maxHp, 'Terminal max HP bound');
  if (maxhp < 1 || hp > maxhp) throw new Error(`Terminal HP commit is outside Showdown/persistent bounds: ${hp}/${maxhp}`);
  const status = exactTerminalStatus(resolved.status);
  const heldItem = exactTerminalItem(resolved.heldItem);
  const fainted = exactTerminalFainted(resolved.fainted, hp);
  const patch = { hp, status, moves: mergeResolvedMovePp(source.moves, resolved.moves), heldItem, fainted };
  if (status === 'slp') patch.statusTurns = exactSleepTurns(resolved.statusTurns, 'Terminal');
  else patch.statusTurns = undefined;
  return patch;
}
function clearTransientBattleState(member) {
  const clean = { ...member };
  for (const field of TRANSIENT_FIELDS) delete clean[field];
  return clean;
}
function resolvedMemberId(member) {
  const raw = member?.maplessId;
  if (raw === undefined || raw === null || String(raw) === '') throw new Error('Terminal party commit requires maplessId on every resolved Showdown member');
  return String(raw);
}
function matchTerminalParty(sourceParty = [], resolvedParty = []) {
  if (!Array.isArray(resolvedParty) || resolvedParty.length !== sourceParty.length) throw new Error(`Terminal party commit requires one resolved Showdown member per persistent member: ${resolvedParty?.length ?? 0}/${sourceParty.length}`);
  const persistentIds = new Set();
  for (const member of sourceParty) {
    const id = persistentMemberId(member);
    if (persistentIds.has(id)) throw new Error(`Duplicate persistent Mapless member id during terminal party commit: ${id}`);
    persistentIds.add(id);
  }
  const byId = new Map();
  for (const member of resolvedParty) {
    const id = resolvedMemberId(member);
    if (byId.has(id)) throw new Error(`Duplicate resolved Showdown maplessId during terminal party commit: ${id}`);
    if (!persistentIds.has(id)) throw new Error(`Terminal party commit contains unknown resolved Showdown member: ${id}`);
    byId.set(id, member);
  }
  for (const id of persistentIds) if (!byId.has(id)) throw new Error(`Terminal party commit is missing resolved Showdown member: ${id}`);
  return byId;
}

export function commitShowdownTerminalResult(state, result) {
  if (!result?.terminal) throw new Error('Only terminal Showdown results may commit to Mapless state');
  if (!result.resultId) throw new Error('Terminal Showdown result requires resultId');
  const resultId = String(result.resultId);
  const applied = state.diagnostics?.[BATTLE_SYNC_IDS] ?? [];
  if (applied.includes(resultId)) return { state, committed: false, duplicate: true };
  const byId = matchTerminalParty(state.party, result.party);
  const next = cloneGameState(state);
  next.party = next.party.map((member) => {
    const clean = clearTransientBattleState(member);
    const id = persistentMemberId(member);
    const patch = persistentPatch(clean, byId.get(id));
    const committed = { ...clean, ...patch };
    if (patch.statusTurns === undefined) delete committed.statusTurns;
    return committed;
  });
  next.diagnostics ??= {};
  next.diagnostics[BATTLE_SYNC_IDS] ??= [];
  next.diagnostics[BATTLE_SYNC_IDS].push(resultId);
  return { state: next, committed: true, duplicate: false };
}
export function getShowdownPersistentFields() { return PERSISTENT_FIELDS.slice(); }

import { resolveP1CanonicalBattleSprite } from '../assets/p1-battle-sprites.js';

function memberId(member) {
  return String(member?.maplessId ?? member?.id ?? member?.personalId ?? '');
}
function activePersistentPartyMember(party = []) {
  return party.find((member) => Number(member?.hp ?? 0) > 0 && member?.fainted !== true) ?? party[0] ?? null;
}
function normalizedResolvedMember(member, fallback = null) {
  const source = member ?? fallback;
  if (!source) return null;
  const hp = Number(source.hp ?? 0);
  const maxhp = Number(source.maxhp ?? source.maxHp ?? hp);
  return Object.freeze({
    id: memberId(source),
    species: String(source.species ?? fallback?.species ?? ''),
    name: String(source.name ?? source.species ?? fallback?.name ?? fallback?.species ?? ''),
    level: Number(source.level ?? fallback?.level ?? 1),
    hp,
    maxhp,
    hpRatio: maxhp > 0 ? Math.max(0, Math.min(1, hp / maxhp)) : 0,
    status: String(source.status ?? ''),
    fainted: Boolean(source.fainted ?? hp === 0),
    moves: Object.freeze((source.moves ?? fallback?.moves ?? []).map((move) => Object.freeze({
      id: String(move?.id ?? move?.move ?? move ?? ''),
      pp: Number(move?.pp ?? 0),
      maxpp: Number(move?.maxpp ?? move?.maxPP ?? move?.pp ?? 0),
    }))),
  });
}
function encounterPokemon(state, activeBattle) {
  return activeBattle?.encounter?.pokemon
    ?? state?.activeEncounter?.encounter?.pokemon
    ?? state?.pendingBattleResult?.encounter?.pokemon
    ?? null;
}
function findPersistentMember(party, resolved) {
  const id = memberId(resolved);
  return party.find((member) => memberId(member) === id) ?? null;
}
function projectSide({ side, resolved, persistent }) {
  const member = normalizedResolvedMember(resolved, persistent);
  if (!member) return null;
  const species = member.species || persistent?.species || '';
  const form = Number(persistent?.form ?? 0);
  return Object.freeze({
    ...member,
    species,
    name: member.name || species,
    sprite: species ? resolveP1CanonicalBattleSprite({ species, form, side }) : null,
  });
}

export function projectP1BattleView({ state, resolved = null, activeBattle = null } = {}) {
  if (!state) throw new Error('P1 battle view requires canonical state');
  const persistentPlayer = activePersistentPartyMember(state.party ?? []);
  const resolvedPlayer = resolved?.p1?.[0] ?? null;
  const playerFallback = findPersistentMember(state.party ?? [], resolvedPlayer) ?? persistentPlayer;
  const foeFallback = encounterPokemon(state, activeBattle);
  const player = projectSide({ side: 'player', resolved: resolvedPlayer, persistent: playerFallback });
  const foe = projectSide({ side: 'foe', resolved: resolved?.p2?.[0] ?? null, persistent: foeFallback });
  const visible = ['battle_pending', 'battle_result'].includes(state.mode) || Boolean(activeBattle);
  return Object.freeze({
    visible,
    battleId: activeBattle?.battleId ?? state.activeBattle?.id ?? state.pendingBattleResult?.battleId ?? null,
    player,
    foe,
    commandEnabled: Boolean(activeBattle && !resolved?.terminal && state.mode === 'battle_pending'),
    rewardPending: state.mode === 'battle_result' && state.pendingBattleResult?.outcome === 'win',
    outcome: state.pendingBattleResult?.outcome ?? null,
  });
}

export function projectP1BoardView(state) {
  if (!state) throw new Error('P1 Board view requires canonical state');
  return Object.freeze({
    visible: state.mode === 'board',
    day: Number(state.day),
    money: Number(state.money ?? 0),
    slots: Object.freeze((state.board ?? []).map((slot, index) => Object.freeze({
      index,
      kind: String(slot.kind),
      type: slot.type == null ? null : String(slot.type),
      consumed: Boolean(slot.consumed),
      prepared: Boolean(slot.encounter),
      enabled: !slot.consumed && (slot.kind === 'wild' || slot.kind === 'next_day'),
    }))),
  });
}

function active(side) {
  return Array.isArray(side) && side.length ? side[0] : null;
}
function moveAt(member, slot) {
  const index = Number(slot) - 1;
  if (!member || !Number.isInteger(index) || index < 0) return null;
  return member.moves?.[index] ?? null;
}
function hpEvent(side, before, after) {
  if (!before || !after) return [];
  const from = Number(before.hp);
  const to = Number(after.hp);
  return Number.isFinite(from) && Number.isFinite(to) && to < from
    ? [{ type: 'DAMAGE_APPLIED', side, hpBefore: from, hpAfter: to, amount: from - to }]
    : [];
}
function statusEvents(side, before, after) {
  if (!before || !after) return [];
  const from = String(before.status ?? '');
  const to = String(after.status ?? '');
  return from !== to && to
    ? [{ type: 'STATUS_APPLIED', side, status: to }]
    : [];
}
function itemEvents(side, before, after) {
  if (!before || !after) return [];
  const from = String(before.heldItem ?? '');
  const to = String(after.heldItem ?? '');
  return from && from !== to
    ? [{ type: 'ITEM_TRIGGERED', side, itemId: from, consumed: !to }]
    : [];
}
function faintEvents(side, before, after) {
  if (!before || !after) return [];
  return !before.fainted && after.fainted
    ? [{ type: 'POKEMON_FAINTED', side, maplessId: after.maplessId }]
    : [];
}

export function projectShowdownRoundSemanticEvents(before, after, { playerMoveSlot, foeMoveSlot } = {}) {
  if (!before || !after) throw new TypeError('before and after Showdown states are required');
  const playerBefore = active(before.p1);
  const foeBefore = active(before.p2);
  const playerAfter = active(after.p1);
  const foeAfter = active(after.p2);
  const events = [];
  const playerMove = moveAt(playerBefore, playerMoveSlot);
  const foeMove = moveAt(foeBefore, foeMoveSlot);
  if (playerMove) events.push({ type: 'MOVE_USED', side: 'player', moveId: String(playerMove.id) });
  if (foeMove) events.push({ type: 'MOVE_USED', side: 'foe', moveId: String(foeMove.id) });
  events.push(
    ...hpEvent('player', playerBefore, playerAfter),
    ...hpEvent('foe', foeBefore, foeAfter),
    ...statusEvents('player', playerBefore, playerAfter),
    ...statusEvents('foe', foeBefore, foeAfter),
    ...itemEvents('player', playerBefore, playerAfter),
    ...itemEvents('foe', foeBefore, foeAfter),
    ...faintEvents('player', playerBefore, playerAfter),
    ...faintEvents('foe', foeBefore, foeAfter),
  );
  return events.map((event) => Object.freeze(event));
}

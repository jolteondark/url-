import assert from 'node:assert/strict';

const id = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const moves = (slots) => slots.map((move) => ({ id: id(move.id), pp: Number(move.pp), maxpp: Number(move.maxpp ?? move.maxPP) }));

// Compare every Mapless-persistent component with actual pinned Pokemon objects.
// Species/form and ability use the engine's base representation: Transform's
// current species, ability and executable moves are intentionally transient.
export function assertPersistentRawDifferential(raw, persistent, resolved, label) {
  assert.equal(resolved.maplessId, String(persistent.maplessId ?? persistent.id), `${label} stable identity`);
  assert.equal(id(raw.baseSpecies.id), id(persistent.species), `${label} base species/form`);
  assert.equal(Number(raw.level), Number(persistent.level), `${label} level`);
  assert.equal(id(raw.baseAbility), id(persistent.ability), `${label} base ability`);
  assert.equal(Number(raw.hp), Number(persistent.hp), `${label} persistent HP`);
  assert.equal(Number(raw.maxhp), Number(persistent.maxhp), `${label} persistent max HP`);
  assert.equal(String(raw.status), String(persistent.status ?? ''), `${label} persistent status`);
  assert.equal(String(raw.item), String(persistent.heldItem ?? ''), `${label} persistent held item`);
  assert.equal(Boolean(raw.fainted), Boolean(persistent.fainted), `${label} persistent faint state`);
  assert.deepEqual(moves(raw.baseMoveSlots), moves(persistent.moves), `${label} persistent base moves/PP/maxPP`);
  const expected = {
    maplessId: String(persistent.maplessId ?? persistent.id),
    hp: Number(raw.hp), maxhp: Number(raw.maxhp), status: String(raw.status),
    heldItem: String(raw.item), fainted: Boolean(raw.fainted), moves: moves(raw.baseMoveSlots),
  };
  if (raw.status === 'slp') {
    assert.equal(Number(raw.statusState.time), Number(persistent.statusTurns), `${label} remaining Sleep turns`);
    expected.statusTurns = Number(raw.statusState.time);
  }
  assert.deepEqual(resolved, expected, `${label} adapter/raw differential`);
}

export function assertRequestRawDifferential(side, label) {
  const request = side.activeRequest;
  assert.ok(request && !request.wait && !request.teamPreview && !request.forceSwitch, `${label} move request`);
  assert.equal(request.side.pokemon.length, side.pokemon.length, `${label} request party size`);
  side.pokemon.forEach((raw, index) => {
    const requested = request.side.pokemon[index];
    const expectedCondition = raw.fainted ? '0 fnt' : `${raw.hp}/${raw.maxhp}${raw.status ? ` ${raw.status}` : ''}`;
    assert.equal(requested.condition, expectedCondition, `${label}[${index}] HP/status/faint request`);
    assert.equal(requested.details, raw.details, `${label}[${index}] species/form/level request`);
    assert.equal(requested.baseAbility, raw.baseAbility, `${label}[${index}] base ability request`);
    assert.equal(requested.ability, raw.ability, `${label}[${index}] executable ability request`);
    assert.equal(requested.item, raw.item, `${label}[${index}] held item request`);
    assert.deepEqual(requested.moves, raw.moveSlots.map((move) => move.id), `${label}[${index}] executable move identity request`);
  });
  assert.equal(request.active.length, side.active.length, `${label} active slot count`);
  side.active.forEach((raw, index) => {
    assert.deepEqual(moves(request.active[index].moves), moves(raw.moveSlots), `${label}[${index}] executable PP/maxPP request`);
  });
}

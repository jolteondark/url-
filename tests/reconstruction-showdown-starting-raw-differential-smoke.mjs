import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }
function requestView(pokemon) { return { hp: pokemon.hp, status: pokemon.status, item: pokemon.item, fainted: pokemon.fainted, moves: (pokemon.moveSlots ?? []).map(({ id, pp }) => ({ id, pp })) }; }
function fakeShowdown(raw) {
  return { BattleStreams: { BattleStream, getPlayerStreams(stream) { const omniscient = new Stream(); omniscient.write = async (value) => { if (!value.startsWith('>player p2 ')) return; stream.battle = { ended: false, winner: '', turn: 0, requestSnapshots: [], sides: [{ pokemon: [raw.p1] }, { pokemon: [raw.p2] }], initEffectState(initial) { return { ...initial }; }, makeRequest() { this.requestSnapshots.push({ p1: requestView(this.sides[0].pokemon[0]), p2: requestView(this.sides[1].pokemon[0]) }); } }; }; return { omniscient, p1: new Stream(), p2: new Stream() }; } }, Teams: { pack: () => 'PACKED' } };
}
function freshRaw() { return { p1: { species: { id: 'pikachu' }, level: 1, hp: 35, maxhp: 35, status: '', statusState: {}, item: 'oranberry', fainted: false, moveSlots: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }] }, p2: { species: { id: 'magikarp' }, level: 1, hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }] } }; }

const raw = freshRaw();
const persistent = { id: 'hero', species: 'Pikachu', level: 1, hp: 17, maxhp: 35, status: 'slp', statusTurns: 3, heldItem: 'oranberry', moves: [{ id: 'thunderbolt', pp: 4, maxpp: 15 }] };
const wild = { id: 'wild', species: 'Magikarp', level: 1, hp: 11, maxhp: 20, status: '', heldItem: '', moves: [{ id: 'splash', pp: 9, maxpp: 40 }] };
const session = createShowdownStreamSession(fakeShowdown(raw), { p1: { name: 'Mapless', team: [persistent] }, p2: { name: 'Wild', team: [wild] } });
await session.start();
assert.deepEqual({ hp: raw.p1.hp, status: raw.p1.status, statusTurns: raw.p1.statusState.time, item: raw.p1.item, pp: raw.p1.moveSlots[0].pp, fainted: raw.p1.fainted }, { hp: 17, status: 'slp', statusTurns: 3, item: 'oranberry', pp: 4, fainted: false });
assert.deepEqual({ hp: raw.p2.hp, status: raw.p2.status, item: raw.p2.item, pp: raw.p2.moveSlots[0].pp, fainted: raw.p2.fainted }, { hp: 11, status: '', item: '', pp: 9, fainted: false });
assert.deepEqual(session.battleStream.battle.requestSnapshots, [{ p1: { hp: 17, status: 'slp', item: 'oranberry', fainted: false, moves: [{ id: 'thunderbolt', pp: 4 }] }, p2: { hp: 11, status: '', item: '', fainted: false, moves: [{ id: 'splash', pp: 9 }] } }]);
const observed = session.resolvedState();
assert.deepEqual({ hp: observed.p1[0].hp, status: observed.p1[0].status, statusTurns: observed.p1[0].statusTurns, item: observed.p1[0].heldItem, pp: observed.p1[0].moves[0].pp, fainted: observed.p1[0].fainted }, { hp: raw.p1.hp, status: raw.p1.status, statusTurns: raw.p1.statusState.time, item: raw.p1.item, pp: raw.p1.moveSlots[0].pp, fainted: raw.p1.fainted });
assert.deepEqual({ hp: observed.p2[0].hp, status: observed.p2[0].status, item: observed.p2[0].heldItem, pp: observed.p2[0].moves[0].pp, fainted: observed.p2[0].fainted }, { hp: raw.p2.hp, status: raw.p2.status, item: raw.p2.item, pp: raw.p2.moveSlots[0].pp, fainted: raw.p2.fainted });

const moveRaw = freshRaw();
const moveAliasDrift = createShowdownStreamSession(fakeShowdown(moveRaw), { p1: { name: 'Mapless', team: [{ ...persistent, moves: [{ id: 'tbolt', pp: 4 }] }] }, p2: { name: 'Wild', team: [wild] } });
await assert.rejects(() => moveAliasDrift.start(), /Persistent move identity projection mismatch at slot 1: tbolt\/thunderbolt/, 'Showdown alias canonicalization must not silently change persistent move identity');
assert.equal(moveRaw.p1.moveSlots[0].pp, 15, 'move identity mismatch must fail before PP hydration');
assert.equal(moveRaw.p1.hp, 35, 'move identity mismatch must fail before HP hydration');
assert.equal(moveAliasDrift.battleStream.battle.requestSnapshots.length, 0, 'move identity mismatch must not emit a regenerated request');

const levelRaw = freshRaw();
const levelMismatch = createShowdownStreamSession(fakeShowdown(levelRaw), { p1: { name: 'Mapless', team: [{ ...persistent, level: 2 }] }, p2: { name: 'Wild', team: [wild] } });
await assert.rejects(() => levelMismatch.start(), /Persistent level projection mismatch: 2\/1/);
assert.equal(levelRaw.p1.hp, 35);
assert.equal(levelMismatch.battleStream.battle.requestSnapshots.length, 0);
assert.throws(() => createShowdownStreamSession(fakeShowdown(freshRaw()), { p1: { name: 'Mapless', team: [{ ...persistent, level: 1.5 }] }, p2: { name: 'Wild', team: [wild] } }), /Showdown team projection requires an integer level from 1 to 100/);

const maxHpRaw = freshRaw();
const maxHpMismatch = createShowdownStreamSession(fakeShowdown(maxHpRaw), { p1: { name: 'Mapless', team: [{ ...persistent, maxhp: 34 }] }, p2: { name: 'Wild', team: [wild] } });
await assert.rejects(() => maxHpMismatch.start(), /Persistent max HP projection mismatch: 34\/35/);
assert.equal(maxHpRaw.p1.hp, 35);
assert.equal(maxHpMismatch.battleStream.battle.requestSnapshots.length, 0);

const contradictoryRaw = freshRaw();
const contradictory = createShowdownStreamSession(fakeShowdown(contradictoryRaw), { p1: { name: 'Mapless', team: [{ ...persistent, status: '', statusTurns: undefined, fainted: true }] }, p2: { name: 'Wild', team: [wild] } });
await assert.rejects(() => contradictory.start(), /Persistent faint projection is inconsistent with HP/);
assert.equal(contradictoryRaw.p1.hp, 35);
assert.equal(contradictory.battleStream.battle.requestSnapshots.length, 0);

const maxPpRaw = freshRaw();
const maxPpMismatch = createShowdownStreamSession(fakeShowdown(maxPpRaw), { p1: { name: 'Mapless', team: [{ ...persistent, moves: [{ id: 'thunderbolt', pp: 4, maxpp: 14 }] }] }, p2: { name: 'Wild', team: [wild] } });
await assert.rejects(() => maxPpMismatch.start(), /Persistent max PP projection mismatch for thunderbolt: 14\/15/);
assert.equal(maxPpRaw.p1.moveSlots[0].pp, 15);
assert.equal(maxPpMismatch.battleStream.battle.requestSnapshots.length, 0);

const atomicRaw = freshRaw();
const atomic = createShowdownStreamSession(fakeShowdown(atomicRaw), { p1: { name: 'Mapless', team: [persistent] }, p2: { name: 'Wild', team: [{ ...wild, hp: 999 }] } });
await assert.rejects(() => atomic.start(), /Persistent HP projection is outside Showdown bounds/);
assert.deepEqual({ hp: atomicRaw.p1.hp, status: atomicRaw.p1.status, item: atomicRaw.p1.item, pp: atomicRaw.p1.moveSlots[0].pp, fainted: atomicRaw.p1.fainted }, { hp: 35, status: '', item: 'oranberry', pp: 15, fainted: false });
assert.deepEqual({ hp: atomicRaw.p2.hp, status: atomicRaw.p2.status, item: atomicRaw.p2.item, pp: atomicRaw.p2.moveSlots[0].pp, fainted: atomicRaw.p2.fainted }, { hp: 20, status: '', item: '', pp: 40, fainted: false });
assert.equal(atomic.battleStream.battle.requestSnapshots.length, 0);
console.log('reconstruction Showdown starting raw differential smoke: ok');

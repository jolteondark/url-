import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }

function requestView(pokemon) {
  return {
    hp: pokemon.hp,
    status: pokemon.status,
    item: pokemon.item,
    fainted: pokemon.fainted,
    moves: (pokemon.moveSlots ?? []).map(({ id, pp }) => ({ id, pp })),
  };
}

function fakeShowdown(raw) {
  return {
    BattleStreams: {
      BattleStream,
      getPlayerStreams(stream) {
        const omniscient = new Stream();
        omniscient.write = async (value) => {
          if (!value.startsWith('>player p2 ')) return;
          stream.battle = {
            ended: false, winner: '', turn: 0, requestSnapshots: [],
            sides: [{ pokemon: [raw.p1] }, { pokemon: [raw.p2] }],
            initEffectState(initial) { return { ...initial }; },
            makeRequest() {
              this.requestSnapshots.push({ p1: requestView(this.sides[0].pokemon[0]), p2: requestView(this.sides[1].pokemon[0]) });
            },
          };
        };
        return { omniscient, p1: new Stream(), p2: new Stream() };
      },
    },
    Teams: { pack: () => 'PACKED' },
  };
}

function freshRaw() {
  return {
    p1: { hp: 35, maxhp: 35, status: '', statusState: {}, item: 'oranberry', fainted: false, moveSlots: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }] },
    p2: { hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }] },
  };
}

const raw = freshRaw();
const persistent = {
  id: 'hero', species: 'Pikachu', hp: 17, status: 'slp', statusTurns: 3,
  heldItem: 'oranberry', moves: [{ id: 'thunderbolt', pp: 4, maxpp: 15 }],
};
const wild = { id: 'wild', species: 'Magikarp', hp: 11, status: '', heldItem: '', moves: [{ id: 'splash', pp: 9, maxpp: 40 }] };
const session = createShowdownStreamSession(fakeShowdown(raw), { p1: { name: 'Mapless', team: [persistent] }, p2: { name: 'Wild', team: [wild] } });
await session.start();

assert.deepEqual(
  { hp: raw.p1.hp, status: raw.p1.status, statusTurns: raw.p1.statusState.time, item: raw.p1.item, pp: raw.p1.moveSlots[0].pp, fainted: raw.p1.fainted },
  { hp: 17, status: 'slp', statusTurns: 3, item: 'oranberry', pp: 4, fainted: false },
  'raw Showdown state must exactly match persistent starting battle state after hydration',
);
assert.deepEqual(
  { hp: raw.p2.hp, status: raw.p2.status, item: raw.p2.item, pp: raw.p2.moveSlots[0].pp, fainted: raw.p2.fainted },
  { hp: 11, status: '', item: '', pp: 9, fainted: false },
  'raw opponent state must also exactly match its projected persistent state',
);

assert.deepEqual(
  session.battleStream.battle.requestSnapshots,
  [{
    p1: { hp: 17, status: 'slp', item: 'oranberry', fainted: false, moves: [{ id: 'thunderbolt', pp: 4 }] },
    p2: { hp: 11, status: '', item: '', fainted: false, moves: [{ id: 'splash', pp: 9 }] },
  }],
  'the first regenerated choice request must be built exactly once from hydrated persistent HP/status/item/PP/faint on both sides',
);

const observed = session.resolvedState();
assert.deepEqual(
  { hp: observed.p1[0].hp, status: observed.p1[0].status, statusTurns: observed.p1[0].statusTurns, item: observed.p1[0].heldItem, pp: observed.p1[0].moves[0].pp, fainted: observed.p1[0].fainted },
  { hp: raw.p1.hp, status: raw.p1.status, statusTurns: raw.p1.statusState.time, item: raw.p1.item, pp: raw.p1.moveSlots[0].pp, fainted: raw.p1.fainted },
  'p1 adapter observation must be differential-zero against the raw hydrated Showdown object',
);
assert.deepEqual(
  { hp: observed.p2[0].hp, status: observed.p2[0].status, item: observed.p2[0].heldItem, pp: observed.p2[0].moves[0].pp, fainted: observed.p2[0].fainted },
  { hp: raw.p2.hp, status: raw.p2.status, item: raw.p2.item, pp: raw.p2.moveSlots[0].pp, fainted: raw.p2.fainted },
  'p2 adapter observation must be differential-zero against the raw hydrated Showdown object',
);

const contradictoryRaw = freshRaw();
const contradictory = createShowdownStreamSession(fakeShowdown(contradictoryRaw), {
  p1: { name: 'Mapless', team: [{ ...persistent, status: '', statusTurns: undefined, fainted: true }] },
  p2: { name: 'Wild', team: [wild] },
});
await assert.rejects(
  () => contradictory.start(),
  /Persistent faint projection is inconsistent with HP/,
  'direct stream hydration must reject a persisted faint flag that contradicts positive HP',
);
assert.equal(contradictoryRaw.p1.hp, 35, 'failed faint validation must occur before persistent HP mutates the Showdown object');
assert.equal(contradictory.battleStream.battle.requestSnapshots.length, 0, 'failed preflight must not build a choice request from uncommitted projection state');

const maxPpRaw = freshRaw();
const maxPpMismatch = createShowdownStreamSession(fakeShowdown(maxPpRaw), {
  p1: { name: 'Mapless', team: [{ ...persistent, moves: [{ id: 'thunderbolt', pp: 4, maxpp: 14 }] }] },
  p2: { name: 'Wild', team: [wild] },
});
await assert.rejects(
  () => maxPpMismatch.start(),
  /Persistent max PP projection mismatch for thunderbolt: 14\/15/,
  'persistent max PP metadata must agree with the authoritative Showdown move slot before current PP is hydrated',
);
assert.equal(maxPpRaw.p1.moveSlots[0].pp, 15, 'max PP mismatch must fail before current PP mutates the Showdown slot');
assert.equal(maxPpMismatch.battleStream.battle.requestSnapshots.length, 0, 'max PP mismatch must not emit a regenerated request');

const atomicRaw = freshRaw();
const atomic = createShowdownStreamSession(fakeShowdown(atomicRaw), {
  p1: { name: 'Mapless', team: [persistent] },
  p2: { name: 'Wild', team: [{ ...wild, hp: 999 }] },
});
await assert.rejects(
  () => atomic.start(),
  /Persistent HP projection is outside Showdown bounds/,
  'a later-side projection failure must reject the whole starting projection',
);
assert.deepEqual(
  { hp: atomicRaw.p1.hp, status: atomicRaw.p1.status, item: atomicRaw.p1.item, pp: atomicRaw.p1.moveSlots[0].pp, fainted: atomicRaw.p1.fainted },
  { hp: 35, status: '', item: 'oranberry', pp: 15, fainted: false },
  'p2 validation failure must not leave p1 partially hydrated',
);
assert.deepEqual(
  { hp: atomicRaw.p2.hp, status: atomicRaw.p2.status, item: atomicRaw.p2.item, pp: atomicRaw.p2.moveSlots[0].pp, fainted: atomicRaw.p2.fainted },
  { hp: 20, status: '', item: '', pp: 40, fainted: false },
  'failed starting projection must leave p2 raw state untouched too',
);
assert.equal(atomic.battleStream.battle.requestSnapshots.length, 0, 'cross-side preflight failure must not emit a regenerated request');

console.log('reconstruction Showdown starting raw differential smoke: ok');

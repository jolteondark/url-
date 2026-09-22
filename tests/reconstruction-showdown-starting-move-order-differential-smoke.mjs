import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }

function fakeShowdown(raw) {
  return {
    BattleStreams: {
      BattleStream,
      getPlayerStreams(stream) {
        const omniscient = new Stream();
        omniscient.write = async (value) => {
          if (!value.startsWith('>player p2 ')) return;
          stream.battle = {
            ended: false,
            winner: '',
            turn: 0,
            requestCount: 0,
            sides: [{ pokemon: [raw.p1] }, { pokemon: [raw.p2] }],
            initEffectState(initial) { return { ...initial }; },
            makeRequest() { this.requestCount += 1; },
          };
        };
        return { omniscient, p1: new Stream(), p2: new Stream() };
      },
    },
    Teams: { pack: () => 'PACKED' },
  };
}

const persistent = {
  id: 'hero', species: 'Pikachu', level: 1, hp: 17, maxhp: 35, status: '', heldItem: '',
  moves: [
    { id: 'thunderbolt', pp: 4, maxpp: 15 },
    { id: 'quickattack', pp: 12, maxpp: 30 },
  ],
};
const wild = {
  id: 'wild', species: 'Magikarp', level: 1, hp: 11, maxhp: 20, status: '', heldItem: '',
  moves: [{ id: 'splash', pp: 9, maxpp: 40 }],
};
const raw = {
  p1: {
    species: { id: 'pikachu' }, level: 1, hp: 35, maxhp: 35, status: '', statusState: {}, item: '', fainted: false,
    // Same move set and legal PP, but Showdown slot order differs from the persistent Mapless order.
    moveSlots: [
      { id: 'quickattack', pp: 30, maxpp: 30 },
      { id: 'thunderbolt', pp: 15, maxpp: 15 },
    ],
  },
  p2: {
    species: { id: 'magikarp' }, level: 1, hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false,
    moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }],
  },
};

const session = createShowdownStreamSession(fakeShowdown(raw), {
  p1: { name: 'Mapless', team: [persistent] },
  p2: { name: 'Wild', team: [wild] },
});

await assert.rejects(
  () => session.start(),
  /Persistent move identity projection mismatch at slot 1: thunderbolt\/quickattack/,
  'move order is part of the FIGHT slot contract and must not be silently rematched by id',
);
assert.deepEqual(raw.p1.moveSlots.map(({ id, pp }) => ({ id, pp })), [
  { id: 'quickattack', pp: 30 },
  { id: 'thunderbolt', pp: 15 },
], 'slot-order mismatch must fail before any PP hydration');
assert.equal(raw.p1.hp, 35, 'slot-order mismatch must fail before HP hydration');
assert.equal(raw.p2.hp, 20, 'cross-side atomicity must leave p2 untouched too');
assert.equal(session.battleStream.battle.requestCount, 0, 'slot-order mismatch must fail before first request regeneration');

console.log('reconstruction Showdown starting move-order differential smoke: ok');

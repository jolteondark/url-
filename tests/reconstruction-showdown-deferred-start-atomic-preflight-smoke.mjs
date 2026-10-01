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
          if (value.startsWith('>start ')) {
            stream.battle = {
              ended: false, winner: '', turn: 0, started: false, requestCount: 0,
              sides: [
                { pokemon: [raw.p1], pokemonLeft: 1 },
                { pokemon: [raw.p2], pokemonLeft: 1 },
              ],
              initEffectState(initial) { return { ...initial }; },
              makeRequest() { this.requestCount += 1; },
              start() { this.started = true; this.makeRequest(); },
            };
            return;
          }
          if (value.startsWith('>player p2 ')) stream.battle.start();
        };
        return { omniscient, p1: new Stream(), p2: new Stream() };
      },
    },
    Teams: { pack: () => 'PACKED' },
  };
}

const persistent = {
  id: 'hero', species: 'Pikachu', level: 1, hp: 17, maxhp: 35, status: 'par', heldItem: '',
  moves: [{ id: 'thunderbolt', pp: 4, maxpp: 15 }, { id: 'quickattack', pp: 12, maxpp: 30 }],
};
const wild = {
  id: 'wild', species: 'Magikarp', level: 1, hp: 11, maxhp: 20, status: '', heldItem: '',
  moves: [{ id: 'splash', pp: 9, maxpp: 40 }],
};
const raw = {
  p1: {
    species: { id: 'pikachu' }, level: 1, hp: 35, maxhp: 35, status: '', statusState: {}, item: '', fainted: false,
    baseMoveSlots: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }, { id: 'quickattack', pp: 30, maxpp: 30 }],
    moveSlots: [{ id: 'quickattack', pp: 30, maxpp: 30 }, { id: 'thunderbolt', pp: 15, maxpp: 15 }],
  },
  p2: {
    species: { id: 'magikarp' }, level: 1, hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false,
    baseMoveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }], moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }],
  },
};

const session = createShowdownStreamSession(fakeShowdown(raw), {
  p1: { name: 'Mapless', team: [persistent] }, p2: { name: 'Wild', team: [wild] },
});
await assert.rejects(
  () => session.start(),
  /Persistent move identity projection mismatch in moveSlots at slot 1: thunderbolt\/quickattack/,
);
assert.equal(raw.p1.hp, 35);
assert.equal(raw.p1.status, '');
assert.equal(raw.p1.item, '');
assert.equal(raw.p1.fainted, false);
assert.equal(raw.p1.moveSlots[0].pp, 30);
assert.equal(raw.p1.baseMoveSlots[0].pp, 15);
assert.equal(raw.p2.hp, 20);
assert.equal(session.battleStream.battle.started, false);
assert.equal(session.battleStream.battle.requestCount, 0);
console.log('reconstruction Showdown deferred-start atomic preflight smoke: ok');

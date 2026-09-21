import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }
let requestSnapshots = [];
const showdown = {
  BattleStreams: {
    BattleStream,
    getPlayerStreams(stream) {
      const omniscient = new Stream();
      omniscient.write = async (value) => {
        if (!value.startsWith('>player p2 ')) return;
        const pika = { hp: 35, maxhp: 35, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }] };
        const carp = { hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }] };
        stream.battle = {
          ended: false, winner: '', turn: 0,
          sides: [{ pokemon: [pika] }, { pokemon: [carp] }],
          makeRequest() {
            requestSnapshots.push({ hp: pika.hp, status: pika.status, pp: pika.moveSlots[0].pp });
          },
        };
      };
      return { omniscient, p1: new Stream(), p2: new Stream() };
    },
  },
  Teams: { pack: () => 'PACKED' },
};

const session = createShowdownStreamSession(showdown, {
  p1: { name: 'Mapless', team: [{ id: 'hero', species: 'Pikachu', hp: 17, status: 'par', moves: [{ id: 'thunderbolt', pp: 3 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
});

await session.start();
assert.deepEqual(requestSnapshots, [{ hp: 17, status: 'par', pp: 3 }], 'Showdown request must be rebuilt only after persistent hydration');
assert.equal(session.resolvedState().p1[0].hp, 17);
assert.equal(session.resolvedState().p1[0].status, 'par');
assert.equal(session.resolvedState().p1[0].moves[0].pp, 3);
console.log('reconstruction-showdown-hydrated-request-smoke: ok');

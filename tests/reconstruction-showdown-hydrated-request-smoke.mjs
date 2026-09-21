import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }
let requestSnapshots = [];
let statusStateSnapshot = null;
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
          initEffectState(initial) { return { effectOrder: 1, ...initial }; },
          makeRequest() {
            statusStateSnapshot = { ...pika.statusState };
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
  p1: { name: 'Mapless', team: [{ id: 'hero', species: 'Pikachu', hp: 17, status: 'tox', moves: [{ id: 'thunderbolt', pp: 3 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
});

await session.start();
assert.deepEqual(requestSnapshots, [{ hp: 17, status: 'tox', pp: 3 }], 'Showdown request must be rebuilt only after persistent hydration');
assert.equal(statusStateSnapshot.id, 'tox');
assert.equal(statusStateSnapshot.stage, 0, 'pre-existing toxic must enter a fresh battle at Showdown toxic stage 0');
assert.equal(session.resolvedState().p1[0].hp, 17);
assert.equal(session.resolvedState().p1[0].status, 'tox');
assert.equal(session.resolvedState().p1[0].moves[0].pp, 3);

const sleeping = createShowdownStreamSession(showdown, {
  p1: { name: 'Mapless', team: [{ id: 'sleepy', species: 'Pikachu', hp: 17, status: 'slp', statusTurns: 2, moves: [{ id: 'thunderbolt', pp: 3 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild-2', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
});
await sleeping.start();
assert.equal(sleeping.battleStream.battle.sides[0].pokemon[0].statusState.time, 2);
assert.equal(sleeping.battleStream.battle.sides[0].pokemon[0].statusState.startTime, 2);
assert.equal(sleeping.resolvedState().p1[0].statusTurns, 2, 'remaining Showdown sleep turns must cross the terminal observation boundary');

const ambiguousSleep = createShowdownStreamSession(showdown, {
  p1: { name: 'Mapless', team: [{ id: 'sleepy-unknown', species: 'Pikachu', hp: 17, status: 'slp', moves: [{ id: 'thunderbolt', pp: 3 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild-3', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
});
await assert.rejects(() => ambiguousSleep.start(), /Persistent sleep projection requires statusTurns/);

const missingHp = createShowdownStreamSession(showdown, {
  p1: { name: 'Mapless', team: [{ id: 'missing-hp', species: 'Pikachu', moves: [{ id: 'thunderbolt', pp: 3 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild-hp', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
});
await assert.rejects(() => missingHp.start(), /Persistent HP projection requires finite current HP/);

const missingPp = createShowdownStreamSession(showdown, {
  p1: { name: 'Mapless', team: [{ id: 'missing-pp', species: 'Pikachu', hp: 17, moves: [{ id: 'thunderbolt' }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild-4', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
});
await assert.rejects(() => missingPp.start(), /Persistent PP projection requires current PP for move: thunderbolt/);

const mismatchedMove = createShowdownStreamSession(showdown, {
  p1: { name: 'Mapless', team: [{ id: 'wrong-move', species: 'Pikachu', hp: 17, moves: [{ id: 'quickattack', pp: 7 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild-5', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
});
await assert.rejects(() => mismatchedMove.start(), /Persistent PP projection could not match Showdown move slot: thunderbolt/);

console.log('reconstruction Showdown hydrated request/status/HP/PP smoke: ok');

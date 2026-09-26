import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }

function fakeShowdown(p1Item) {
  return {
    BattleStreams: {
      BattleStream,
      getPlayerStreams(stream) {
        const omniscient = new Stream();
        omniscient.write = async (value) => {
          if (!value.startsWith('>player p2 ')) return;
          const pika = { hp: 35, maxhp: 35, status: '', statusState: {}, item: p1Item, fainted: false, moveSlots: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }] };
          const carp = { hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }] };
          stream.battle = {
            ended: false, winner: '', turn: 0,
            sides: [{ pokemon: [pika] }, { pokemon: [carp] }],
            initEffectState(initial) { return { ...initial }; },
            makeRequest() {},
          };
        };
        return { omniscient, p1: new Stream(), p2: new Stream() };
      },
    },
    Teams: { pack: () => 'PACKED' },
  };
}

const config = {
  p1: { name: 'Mapless', team: [{ id: 'hero', species: 'Pikachu', hp: 17, heldItem: 'Oran Berry', moves: [{ id: 'thunderbolt', pp: 3 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild', species: 'Magikarp', hp: 11, moves: [{ id: 'splash', pp: 9 }] }] },
};

const exact = createShowdownStreamSession(fakeShowdown('oranberry'), config);
await exact.start();
assert.equal(exact.battleStream.battle.sides[0].pokemon[0].item, 'oranberry');
assert.equal(exact.resolvedState().p1[0].heldItem, 'oranberry', 'resolved item must be Showdown-authoritative after exact starting projection');

const mismatched = createShowdownStreamSession(fakeShowdown(''), config);
await assert.rejects(() => mismatched.start(), /Persistent held-item projection mismatch: oranberry\/<empty>/);

console.log('reconstruction Showdown held-item exact projection smoke: ok');

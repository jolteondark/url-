import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }

const raw = {
  p1: { hp: 35, maxhp: 35, status: '', statusState: {}, item: 'oranberry', fainted: false, moveSlots: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }] },
  p2: { hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }] },
};

const showdown = {
  BattleStreams: {
    BattleStream,
    getPlayerStreams(stream) {
      const omniscient = new Stream();
      omniscient.write = async (value) => {
        if (!value.startsWith('>player p2 ')) return;
        stream.battle = {
          ended: false, winner: '', turn: 0,
          sides: [{ pokemon: [raw.p1] }, { pokemon: [raw.p2] }],
          initEffectState(initial) { return { ...initial }; },
          makeRequest() {},
        };
      };
      return { omniscient, p1: new Stream(), p2: new Stream() };
    },
  },
  Teams: { pack: () => 'PACKED' },
};

const persistent = {
  id: 'hero', species: 'Pikachu', hp: 17, status: 'slp', statusTurns: 3,
  heldItem: 'oranberry', moves: [{ id: 'thunderbolt', pp: 4 }],
};
const wild = { id: 'wild', species: 'Magikarp', hp: 11, status: '', heldItem: '', moves: [{ id: 'splash', pp: 9 }] };
const session = createShowdownStreamSession(showdown, { p1: { name: 'Mapless', team: [persistent] }, p2: { name: 'Wild', team: [wild] } });
await session.start();

// Compare the actual hydrated simulator object, not only the adapter projection.
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

const observed = session.resolvedState();
assert.deepEqual(
  { hp: observed.p1[0].hp, status: observed.p1[0].status, statusTurns: observed.p1[0].statusTurns, item: observed.p1[0].heldItem, pp: observed.p1[0].moves[0].pp, fainted: observed.p1[0].fainted },
  { hp: raw.p1.hp, status: raw.p1.status, statusTurns: raw.p1.statusState.time, item: raw.p1.item, pp: raw.p1.moveSlots[0].pp, fainted: raw.p1.fainted },
  'adapter observation must be differential-zero against the raw hydrated Showdown object',
);

console.log('reconstruction Showdown starting raw differential smoke: ok');

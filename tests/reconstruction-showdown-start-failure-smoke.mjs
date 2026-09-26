import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class FakeStream {
  constructor(onWrite = null) {
    this.writes = [];
    this.onWrite = onWrite;
  }
  async write(value) {
    this.writes.push(value);
    await this.onWrite?.(value);
  }
}

class FakeBattleStream {
  constructor() { this.battle = null; }
}

let battleStream;
const omniscient = new FakeStream(async (value) => {
  // Deliberately create a cardinality mismatch after Showdown has accepted the
  // one-shot start/player projection. Hydration must fail closed, and a caller
  // must never be able to replay >start/>player into this partially initialized
  // authoritative stream.
  if (value.startsWith('>player p2 ')) {
    battleStream.battle = {
      ended: false,
      winner: '',
      turn: 0,
      sides: [
        { pokemon: [] },
        { pokemon: [{ hp: 20, maxhp: 20, status: '', item: '', fainted: false, moveSlots: [{ id: 'tackle', pp: 35, maxpp: 35 }] }] },
      ],
    };
  }
});
const p1 = new FakeStream();
const p2 = new FakeStream();

const showdown = {
  BattleStreams: {
    BattleStream: class extends FakeBattleStream {
      constructor() {
        super();
        battleStream = this;
      }
    },
    getPlayerStreams() { return { omniscient, p1, p2 }; },
  },
  Teams: { pack(team) { return JSON.stringify(team); } },
};

const config = {
  p1: { name: 'Mapless', team: [{ id: 'hero', species: 'Pikachu', hp: 10, moves: [{ id: 'tackle', pp: 5 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild', species: 'Rattata', hp: 10, moves: [{ id: 'tackle', pp: 5 }] }] },
};

const session = createShowdownStreamSession(showdown, config);
await assert.rejects(session.start(), /one resolved Pokemon per projected team member/);
assert.equal(omniscient.writes.length, 3, 'first failed projection writes start + both players exactly once');
await assert.rejects(session.start(), /partial projection cannot be replayed/);
assert.equal(omniscient.writes.length, 3, 'failed start must never replay Showdown projection writes');
assert.throws(() => session.resolvedState(), /not available/, 'failed hydration must never expose a started session');

console.log('reconstruction-showdown-start-failure-smoke: ok');

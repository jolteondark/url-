import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class FakeStream {
  constructor() { this.writes = []; }
  async write(value) { this.writes.push(value); }
}
class FakeBattleStream extends FakeStream {}
const omniscient = new FakeStream();
const p1 = new FakeStream();
const p2 = new FakeStream();
const showdown = {
  BattleStreams: {
    BattleStream: FakeBattleStream,
    getPlayerStreams(stream) {
      assert.ok(stream instanceof FakeBattleStream);
      return { omniscient, p1, p2 };
    },
  },
  Teams: {
    pack(team) { return `PACKED:${JSON.stringify(team)}`; },
  },
};

const config = {
  formatid: 'gen9customgame',
  seed: [1, 2, 3, 4],
  p1: {
    name: 'Mapless',
    team: [{ species: 'Pikachu', level: 10, ability: 'Static', heldItem: 'Oran Berry', moves: [{ id: 'thundershock' }] }],
  },
  p2: {
    name: 'Wild',
    team: [{ species: 'Rattata', level: 8, moves: [{ id: 'tackle' }] }],
  },
};
const session = createShowdownStreamSession(showdown, config);
assert.equal(await session.start(), true);
assert.equal(await session.start(), false, 'battle start must be exactly once');
assert.equal(omniscient.writes.length, 3);
assert.equal(omniscient.writes[0], '>start {"formatid":"gen9customgame","seed":[1,2,3,4]}');
assert.match(omniscient.writes[1], /^>player p1 /);
assert.match(omniscient.writes[1], /PACKED:/);
assert.match(omniscient.writes[2], /^>player p2 /);

await session.fight('p1', 1);
await session.fight('p2', 1);
assert.deepEqual(p1.writes, ['move 1']);
assert.deepEqual(p2.writes, ['move 1']);

await assert.rejects(async () => createShowdownStreamSession(showdown, config).fight('p1', 1), /must start/);
await assert.rejects(session.fight('p1', 0), /positive Showdown move slot/);
await assert.rejects(session.choose('p3', 'move 1'), /Invalid Showdown side/);

console.log('reconstruction-showdown-stream-session-smoke: ok');

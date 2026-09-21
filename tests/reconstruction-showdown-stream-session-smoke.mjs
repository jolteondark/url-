import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class FakeStream {
  constructor() { this.writes = []; }
  async write(value) { this.writes.push(value); }
}
class FakeBattleStream extends FakeStream {
  constructor() {
    super();
    this.battle = null;
  }
}
const omniscient = new FakeStream();
const p1 = new FakeStream();
const p2 = new FakeStream();
const showdown = {
  BattleStreams: {
    BattleStream: FakeBattleStream,
    getPlayerStreams(stream) {
      assert.ok(stream instanceof FakeBattleStream);
      const write = omniscient.write.bind(omniscient);
      omniscient.write = async (value) => {
        await write(value);
        if (value.startsWith('>start ')) {
          stream.battle = {
            ended: false,
            winner: '',
            turn: 0,
            sides: [
              { pokemon: [
                { hp: 25, maxhp: 30, status: '', statusState: {}, item: 'oranberry', fainted: false, moveSlots: [{ id: 'thundershock', pp: 30, maxpp: 30 }] },
                { hp: 24, maxhp: 28, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'vinewhip', pp: 25, maxpp: 25 }] },
              ] },
              { pokemon: [{ hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'tackle', pp: 35, maxpp: 35 }] }] },
            ],
          };
        }
      };
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
    team: [
      { id: 'hero-pika', species: 'Pikachu', level: 10, ability: 'Static', hp: 17, status: 'par', heldItem: 'Oran Berry', moves: [{ id: 'thundershock', pp: 7 }] },
      { id: 'hero-bulba', species: 'Bulbasaur', level: 10, hp: 13, status: '', moves: [{ id: 'vinewhip', pp: 5 }] },
    ],
  },
  p2: {
    name: 'Wild',
    team: [{ id: 'wild-rattata', species: 'Rattata', level: 8, hp: 11, status: '', moves: [{ id: 'tackle', pp: 9 }] }],
  },
};
const session = createShowdownStreamSession(showdown, config);
assert.throws(() => session.resolvedState(), /not available/);
assert.equal(await session.start(), true);
assert.equal(await session.start(), false, 'battle start must be exactly once');
assert.equal(omniscient.writes.length, 3);
assert.equal(omniscient.writes[0], '>start {"formatid":"gen9customgame","seed":[1,2,3,4]}');
assert.match(omniscient.writes[1], /^>player p1 /);
assert.match(omniscient.writes[1], /PACKED:/);
assert.match(omniscient.writes[1], /"item":"Oran Berry"/, 'persistent held item must be projected into the one-shot Showdown team');
assert.match(omniscient.writes[2], /^>player p2 /);

const hydrated = session.resolvedState();
assert.equal(hydrated.p1[0].hp, 17, 'starting current HP must hydrate before the first choice');
assert.equal(hydrated.p1[0].status, 'par', 'starting persistent status must hydrate before the first choice');
assert.equal(hydrated.p1[0].heldItem, 'oranberry', 'starting held item must come from the authoritative Showdown projection');
assert.equal(hydrated.p1[0].moves[0].pp, 7, 'starting PP must hydrate before the first choice');
assert.equal(hydrated.p1[1].hp, 13);
assert.equal(hydrated.p1[1].moves[0].pp, 5);
assert.equal(hydrated.p2[0].hp, 11);
assert.equal(hydrated.p2[0].moves[0].pp, 9);

// Stable identity must follow the authoritative Showdown Pokemon object, not
// the current array position. This models switch/replacement/team reordering.
session.battleStream.battle.sides[0].pokemon.reverse();
const reordered = session.resolvedState();
assert.equal(reordered.p1[0].maplessId, 'hero-bulba');
assert.equal(reordered.p1[0].hp, 13);
assert.equal(reordered.p1[0].moves[0].pp, 5);
assert.equal(reordered.p1[1].maplessId, 'hero-pika');
assert.equal(reordered.p1[1].hp, 17);
session.battleStream.battle.sides[0].pokemon.reverse();

await session.fight('p1', 1);
await session.fight('p2', 1);
assert.deepEqual(p1.writes, ['move 1']);
assert.deepEqual(p2.writes, ['move 1']);

const first = session.resolvedState();
assert.equal(first.terminal, false);
assert.equal(first.p1[0].maplessId, 'hero-pika');
assert.equal(first.p1[0].hp, 17);
assert.deepEqual(first.p1[0].moves, [{ id: 'thundershock', pp: 7, maxpp: 30 }]);

session.battleStream.battle.turn = 1;
session.battleStream.battle.ended = true;
session.battleStream.battle.winner = 'Mapless';
session.battleStream.battle.sides[0].pokemon[0].hp = 18;
session.battleStream.battle.sides[0].pokemon[0].moveSlots[0].pp = 6;
session.battleStream.battle.sides[0].pokemon[0].item = '';
session.battleStream.battle.sides[1].pokemon[0].hp = 0;
session.battleStream.battle.sides[1].pokemon[0].fainted = true;
const resolved = session.resolvedState();
assert.equal(resolved.terminal, true);
assert.equal(resolved.winner, 'Mapless');
assert.equal(resolved.turn, 1);
assert.equal(resolved.p1[0].hp, 18);
assert.equal(resolved.p1[0].moves[0].pp, 6);
assert.equal(resolved.p1[0].heldItem, '', 'Showdown item consumption must be observable at terminal handoff');
assert.equal(resolved.p2[0].fainted, true);
assert.equal(resolved.p2[0].maplessId, 'wild-rattata');
assert.equal('boosts' in resolved.p1[0], false, 'transient battle state must not cross the adapter boundary');

await assert.rejects(async () => createShowdownStreamSession(showdown, config).fight('p1', 1), /must start/);
await assert.rejects(session.fight('p1', 0), /positive Showdown move slot/);
await assert.rejects(session.choose('p3', 'move 1'), /Invalid Showdown side/);

console.log('reconstruction-showdown-stream-session-smoke: ok');

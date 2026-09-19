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
function makeShowdown() {
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
                  { name: 'M000001', hp: 25, maxhp: 30, status: '', item: 'oranberry', fainted: false, moveSlots: [{ id: 'thundershock', pp: 30, maxpp: 30 }] },
                  { name: 'M000002', hp: 19, maxhp: 30, status: 'par', item: '', fainted: false, moveSlots: [{ id: 'quickattack', pp: 29, maxpp: 30 }] },
                ] },
                { pokemon: [{ name: 'M000003', hp: 20, maxhp: 20, status: '', item: '', fainted: false, moveSlots: [{ id: 'tackle', pp: 35, maxpp: 35 }] }] },
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
  return { showdown, omniscient, p1, p2 };
}

const config = {
  formatid: 'gen9customgame',
  seed: [1, 2, 3, 4],
  p1: {
    name: 'Mapless',
    team: [
      { id: 'hero-pika-a', species: 'Pikachu', level: 10, ability: 'Static', heldItem: 'Oran Berry', moves: [{ id: 'thundershock' }] },
      { id: 'hero-pika-b', species: 'Pikachu', level: 10, ability: 'Static', moves: [{ id: 'quickattack' }] },
    ],
  },
  p2: {
    name: 'Wild',
    team: [{ id: 'wild-rattata', species: 'Rattata', level: 8, moves: [{ id: 'tackle' }] }],
  },
};
const { showdown, omniscient, p1, p2 } = makeShowdown();
const session = createShowdownStreamSession(showdown, config);
assert.throws(() => session.resolvedState(), /not available/);
assert.equal(await session.start(), true);
assert.equal(await session.start(), false, 'battle start must be exactly once');
assert.equal(omniscient.writes.length, 3);
assert.equal(omniscient.writes[0], '>start {"formatid":"gen9customgame","seed":[1,2,3,4]}');
assert.match(omniscient.writes[1], /^>player p1 /);
assert.match(omniscient.writes[1], /"name":"M000001"/);
assert.match(omniscient.writes[1], /"name":"M000002"/);
assert.match(omniscient.writes[2], /"name":"M000003"/);

await session.fight('p1', 1);
await session.fight('p2', 1);
assert.deepEqual(p1.writes, ['move 1']);
assert.deepEqual(p2.writes, ['move 1']);

const first = session.resolvedState();
assert.deepEqual(first.p1.map((member) => member.maplessId), ['hero-pika-a', 'hero-pika-b']);
assert.equal(first.p1[1].status, 'par');

session.battleStream.battle.sides[0].pokemon.reverse();
const reordered = session.resolvedState();
assert.deepEqual(
  reordered.p1.map((member) => member.maplessId),
  ['hero-pika-b', 'hero-pika-a'],
  'identity must come from the Showdown-carried token, not sourceTeam[index]',
);

session.battleStream.battle.turn = 1;
session.battleStream.battle.ended = true;
session.battleStream.battle.winner = 'Mapless';
session.battleStream.battle.sides[0].pokemon[1].hp = 18;
session.battleStream.battle.sides[0].pokemon[1].moveSlots[0].pp = 29;
session.battleStream.battle.sides[1].pokemon[0].hp = 0;
session.battleStream.battle.sides[1].pokemon[0].fainted = true;
const resolved = session.resolvedState();
assert.equal(resolved.terminal, true);
assert.equal(resolved.winner, 'Mapless');
assert.equal(resolved.turn, 1);
assert.equal(resolved.p1.find((member) => member.maplessId === 'hero-pika-a').hp, 18);
assert.equal(resolved.p2[0].maplessId, 'wild-rattata');
assert.equal('boosts' in resolved.p1[0], false, 'transient battle state must not cross the adapter boundary');

session.battleStream.battle.sides[0].pokemon[0].name = 'UNKNOWN';
assert.throws(() => session.resolvedState(), /unknown Mapless identity token/);

const duplicateConfig = {
  ...config,
  p1: { ...config.p1, team: [config.p1.team[0], { ...config.p1.team[1], id: 'hero-pika-a' }] },
};
assert.throws(() => createShowdownStreamSession(makeShowdown().showdown, duplicateConfig), /duplicate stable Mapless Pokémon ID/);
const missingConfig = {
  ...config,
  p1: { ...config.p1, team: [{ species: 'Pikachu', moves: [{ id: 'tackle' }] }] },
};
assert.throws(() => createShowdownStreamSession(makeShowdown().showdown, missingConfig), /requires a stable Mapless Pokémon ID/);

await assert.rejects(async () => createShowdownStreamSession(makeShowdown().showdown, config).fight('p1', 1), /must start/);
await assert.rejects(session.fight('p1', 0), /positive Showdown move slot/);
await assert.rejects(session.choose('p3', 'move 1'), /Invalid Showdown side/);

console.log('reconstruction-showdown-stream-session-smoke: ok');

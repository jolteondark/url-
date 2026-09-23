import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class FakeStream {
  constructor(onWrite = null) { this.writes = []; this.onWrite = onWrite; }
  async write(value) { this.writes.push(value); if (this.onWrite) await this.onWrite(value); }
}
class FakeBattleStream { constructor() { this.battle = null; } }

let battleStream;
const p1 = new FakeStream();
const p2 = new FakeStream();
const omniscient = new FakeStream(async (value) => {
  if (value.startsWith('>start ')) {
    battleStream.battle = {
      ended: false, winner: '', turn: 0, started: false,
      sides: [
        { pokemon: [
          { species: { id: 'pikachu' }, level: 10, ability: 'static', hp: 30, maxhp: 30, status: '', statusState: {}, item: 'oranberry', fainted: false, moveSlots: [{ id: 'thundershock', pp: 48, maxpp: 48 }] },
          { species: { id: 'bulbasaur' }, level: 10, ability: '', hp: 28, maxhp: 28, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'vinewhip', pp: 40, maxpp: 40 }] },
        ] },
        { pokemon: [{ species: { id: 'rattata' }, level: 8, ability: '', hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'tackle', pp: 56, maxpp: 56 }] }] },
      ],
      start() { this.started = true; },
    };
    return;
  }
  if (value.startsWith('>player p2 ')) battleStream.battle.start();
});
const showdown = {
  BattleStreams: {
    BattleStream: class extends FakeBattleStream { constructor() { super(); battleStream = this; } },
    getPlayerStreams() { return { omniscient, p1, p2 }; },
  },
  Teams: { pack(team) { return `PACKED:${JSON.stringify(team)}`; } },
};

const config = {
  formatid: 'gen9customgame', seed: [1, 2, 3, 4],
  p1: { name: 'Mapless', team: [
    { id: 'hero-pika', species: 'Pikachu', level: 10, ability: 'Static', hp: 17, status: 'par', heldItem: 'oranberry', moves: [{ id: 'thundershock', pp: 7, maxpp: 30 }] },
    { id: 'hero-bulba', species: 'Bulbasaur', level: 10, hp: 13, status: '', moves: [{ id: 'vinewhip', pp: 5, maxpp: 25 }] },
  ] },
  p2: { name: 'Wild', team: [{ id: 'wild-rattata', species: 'Rattata', level: 8, hp: 11, status: '', moves: [{ id: 'tackle', pp: 9, maxpp: 35 }] }] },
};

const session = createShowdownStreamSession(showdown, config);
assert.throws(() => session.resolvedState(), /not available/);
assert.equal(await session.start(), true);
assert.equal(await session.start(), false, 'battle start must be exactly once');
assert.equal(session.battleStream.battle.started, true);
assert.equal(omniscient.writes.length, 3);
assert.match(omniscient.writes[1], /^>player p1 /);
assert.match(omniscient.writes[2], /^>player p2 /);

const hydrated = session.resolvedState();
assert.equal(hydrated.p1[0].hp, 17);
assert.equal(hydrated.p1[0].status, 'par');
assert.equal(hydrated.p1[0].heldItem, 'oranberry');
assert.equal(hydrated.p1[0].moves[0].pp, 7);
assert.equal(hydrated.p1[0].moves[0].maxpp, 30, 'persistent max PP must replace Showdown constructor PP-Up maxpp before start');
assert.equal(hydrated.p1[1].hp, 13);
assert.equal(hydrated.p1[1].moves[0].maxpp, 25);
assert.equal(hydrated.p2[0].hp, 11);
assert.equal(hydrated.p2[0].moves[0].maxpp, 35);

session.battleStream.battle.sides[0].pokemon.reverse();
assert.equal(session.resolvedState().p1[0].maplessId, 'hero-bulba', 'identity must follow Pokemon objects across reordering');
session.battleStream.battle.sides[0].pokemon.reverse();

await session.fight('p1', 1);
await session.fight('p2', 1);
assert.deepEqual(p1.writes, ['move 1']);
assert.deepEqual(p2.writes, ['move 1']);

session.battleStream.battle.turn = 1;
session.battleStream.battle.ended = true;
session.battleStream.battle.winner = 'Mapless';
session.battleStream.battle.sides[0].pokemon[0].moveSlots[0].pp = 6;
session.battleStream.battle.sides[0].pokemon[0].item = '';
session.battleStream.battle.sides[1].pokemon[0].hp = 0;
session.battleStream.battle.sides[1].pokemon[0].fainted = true;
const resolved = session.resolvedState();
assert.equal(resolved.terminal, true);
assert.equal(resolved.winner, 'Mapless');
assert.equal(resolved.p1[0].moves[0].pp, 6);
assert.equal(resolved.p1[0].heldItem, '');
assert.equal(resolved.p2[0].fainted, true);
assert.equal('boosts' in resolved.p1[0], false);

await assert.rejects(async () => createShowdownStreamSession(showdown, config).fight('p1', 1), /must start/);
await assert.rejects(session.fight('p1', 0), /positive Showdown move slot/);
await assert.rejects(session.choose('p3', 'move 1'), /Invalid Showdown side/);
console.log('reconstruction showdown stream session smoke: ok');

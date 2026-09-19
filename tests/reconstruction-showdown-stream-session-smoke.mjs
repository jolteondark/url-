import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class FakeStream { constructor() { this.writes = []; } async write(value) { this.writes.push(value); } }
class FakeBattleStream extends FakeStream { constructor() { super(); this.battle = null; } }
function pokemon(name, hp, maxhp, move, pp, item = '') {
  return {
    name, hp, maxhp, status: '', item, fainted: false,
    moveSlots: [{ id: move, pp, maxpp: pp }],
    setStatus(status) { this.status = status; return true; },
  };
}
function makeShowdown() {
  const omniscient = new FakeStream();
  const p1 = new FakeStream();
  const p2 = new FakeStream();
  const showdown = {
    BattleStreams: {
      BattleStream: FakeBattleStream,
      getPlayerStreams(stream) {
        const rawWrite = omniscient.write.bind(omniscient);
        omniscient.write = async (value) => {
          await rawWrite(value);
          if (value.startsWith('>start ')) {
            stream.battle = { ended: false, winner: '', turn: 0, sides: [], startCalls: 0, start() { this.startCalls += 1; } };
          } else if (value.startsWith('>player p1 ')) {
            stream.battle.sides[0] = { pokemonLeft: 2, pokemon: [pokemon('M000001', 30, 30, 'thundershock', 30, 'oranberry'), pokemon('M000002', 30, 30, 'quickattack', 30)] };
          } else if (value.startsWith('>player p2 ')) {
            stream.battle.sides[1] = { pokemonLeft: 1, pokemon: [pokemon('M000003', 20, 20, 'tackle', 35)] };
            stream.battle.start();
          }
        };
        return { omniscient, p1, p2 };
      },
    },
    Teams: { pack(team) { return `PACKED:${JSON.stringify(team)}`; } },
  };
  return { showdown, omniscient, p1, p2 };
}

const config = {
  formatid: 'gen9customgame', seed: [1, 2, 3, 4],
  p1: { name: 'Mapless', team: [
    { id: 'hero-pika-a', species: 'Pikachu', level: 10, hp: 25, status: '', ability: 'Static', heldItem: 'Oran Berry', moves: [{ id: 'thundershock', pp: 7 }] },
    { id: 'hero-pika-b', species: 'Pikachu', level: 10, hp: 19, status: 'par', ability: 'Static', moves: [{ id: 'quickattack', pp: 11 }] },
  ] },
  p2: { name: 'Wild', team: [{ id: 'wild-rattata', species: 'Rattata', level: 8, hp: 20, moves: [{ id: 'tackle', pp: 35 }] }] },
};
const { showdown, omniscient, p1, p2 } = makeShowdown();
const session = createShowdownStreamSession(showdown, config);
assert.throws(() => session.resolvedState(), /not available/);
assert.equal(await session.start(), true);
assert.equal(await session.start(), false, 'battle start must be exactly once');
assert.equal(session.battleStream.battle.startCalls, 1, 'native Showdown start must run exactly once');
assert.equal(omniscient.writes.length, 3);
assert.match(omniscient.writes[1], /"name":"M000001"/);
assert.match(omniscient.writes[1], /"name":"M000002"/);
assert.match(omniscient.writes[2], /"name":"M000003"/);

const hydrated = session.resolvedState();
assert.equal(hydrated.p1[0].hp, 25);
assert.equal(hydrated.p1[0].moves[0].pp, 7);
assert.equal(hydrated.p1[1].hp, 19);
assert.equal(hydrated.p1[1].status, 'par');
assert.equal(hydrated.p1[1].moves[0].pp, 11);

await session.fight('p1', 1); await session.fight('p2', 1);
assert.deepEqual(p1.writes, ['move 1']); assert.deepEqual(p2.writes, ['move 1']);

session.battleStream.battle.sides[0].pokemon.reverse();
assert.deepEqual(session.resolvedState().p1.map(x => x.maplessId), ['hero-pika-b', 'hero-pika-a']);

session.battleStream.battle.turn = 1;
session.battleStream.battle.ended = true;
session.battleStream.battle.winner = 'Mapless';
const heroA = session.battleStream.battle.sides[0].pokemon.find(x => x.name === 'M000001');
heroA.hp = 18; heroA.moveSlots[0].pp = 6;
const foe = session.battleStream.battle.sides[1].pokemon[0]; foe.hp = 0; foe.fainted = true;
const resolved = session.resolvedState();
assert.equal(resolved.terminal, true);
assert.equal(resolved.p1.find(x => x.maplessId === 'hero-pika-a').hp, 18);
assert.equal(resolved.p1.find(x => x.maplessId === 'hero-pika-a').moves[0].pp, 6);
assert.equal(resolved.p2[0].maplessId, 'wild-rattata');
assert.equal('boosts' in resolved.p1[0], false);

session.battleStream.battle.sides[0].pokemon[0].name = 'UNKNOWN';
assert.throws(() => session.resolvedState(), /unknown Mapless identity token/);

const duplicateConfig = { ...config, p1: { ...config.p1, team: [config.p1.team[0], { ...config.p1.team[1], id: 'hero-pika-a' }] } };
assert.throws(() => createShowdownStreamSession(makeShowdown().showdown, duplicateConfig), /duplicate stable Mapless Pokémon ID/);
const missingConfig = { ...config, p1: { ...config.p1, team: [{ species: 'Pikachu', moves: [{ id: 'tackle' }] }] } };
assert.throws(() => createShowdownStreamSession(makeShowdown().showdown, missingConfig), /requires a stable Mapless Pokémon ID/);

const badHp = { ...config, p1: { ...config.p1, team: [{ ...config.p1.team[0], hp: 999 }, config.p1.team[1]] } };
await assert.rejects(createShowdownStreamSession(makeShowdown().showdown, badHp).start(), /HP is outside Showdown bounds/);
const badPp = { ...config, p1: { ...config.p1, team: [{ ...config.p1.team[0], moves: [{ id: 'thundershock', pp: 999 }] }, config.p1.team[1]] } };
await assert.rejects(createShowdownStreamSession(makeShowdown().showdown, badPp).start(), /PP is outside Showdown bounds/);

console.log('reconstruction-showdown-stream-session-smoke: ok');

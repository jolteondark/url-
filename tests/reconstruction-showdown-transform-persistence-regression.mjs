import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class FakeStream {
  constructor(onWrite = null) { this.onWrite = onWrite; }
  async write(value) { if (this.onWrite) await this.onWrite(value); }
}
class FakeBattleStream { constructor() { this.battle = null; } }

let battleStream;
const p1 = new FakeStream();
const p2 = new FakeStream();
const omniscient = new FakeStream(async (value) => {
  if (value.startsWith('>start ')) {
    const makePokemon = (species, move, maxpp) => {
      const baseMoveSlots = [{ id: move, pp: maxpp, maxpp }];
      return {
        species: { id: species }, level: 10, ability: '', hp: 30, maxhp: 30,
        status: '', statusState: {}, item: '', fainted: false,
        baseMoveSlots,
        moveSlots: baseMoveSlots.map((slot) => ({ ...slot })),
      };
    };
    battleStream.battle = {
      ended: false, winner: '', turn: 0, started: false,
      sides: [
        { pokemon: [makePokemon('ditto', 'transform', 16)] },
        { pokemon: [makePokemon('pikachu', 'thunderbolt', 24)] },
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
  formatid: 'gen9customgame',
  p1: { name: 'Mapless', team: [{ id: 'hero-ditto', species: 'Ditto', level: 10, hp: 30, status: '', moves: [{ id: 'transform', pp: 7, maxpp: 10 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild-pika', species: 'Pikachu', level: 10, hp: 30, status: '', moves: [{ id: 'thunderbolt', pp: 9, maxpp: 15 }] }] },
};

const session = createShowdownStreamSession(showdown, config);
await session.start();
const ditto = session.battleStream.battle.sides[0].pokemon[0];

// Starting persistence must hydrate both the persistent/base slot and the current
// executable slot before any Showdown start hook can observe the Pokemon.
assert.equal(ditto.baseMoveSlots[0].pp, 7);
assert.equal(ditto.baseMoveSlots[0].maxpp, 10);
assert.equal(ditto.moveSlots[0].pp, 7);
assert.equal(ditto.moveSlots[0].maxpp, 10);

// Simulate a Transform-like volatile replacement of the current executable slots.
// The terminal persistence boundary must ignore these transient slots completely.
ditto.moveSlots = [{ id: 'thunderbolt', pp: 2, maxpp: 5 }];
const resolved = session.resolvedState();
assert.deepEqual(resolved.p1[0].moves, [{ id: 'transform', pp: 7, maxpp: 10 }]);
console.log('reconstruction showdown Transform persistence regression: ok');

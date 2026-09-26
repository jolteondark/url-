import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }

function pokemon(species, move) {
  return {
    species: { id: species.toLowerCase() }, level: 1, hp: 10, maxhp: 10, status: '', statusState: {}, item: '', fainted: false,
    baseMoveSlots: [{ id: move, pp: 10, maxpp: 10 }],
    moveSlots: [{ id: move, pp: 10, maxpp: 10 }],
  };
}
function fakeShowdown() {
  return {
    BattleStreams: {
      BattleStream,
      getPlayerStreams(stream) {
        const omniscient = new Stream();
        omniscient.write = async (value) => {
          if (value.startsWith('>start ')) {
            stream.battle = {
              started: false, ended: false, winner: '', turn: 0,
              sides: [],
              initEffectState(initial) { return { ...initial }; },
              start() { this.started = true; },
            };
          } else if (value.startsWith('>player p1 ')) {
            stream.battle.sides[0] = { pokemon: [pokemon('Pikachu', 'thunderbolt')], pokemonLeft: 1 };
          } else if (value.startsWith('>player p2 ')) {
            stream.battle.sides[1] = { pokemon: [pokemon('Magikarp', 'splash')], pokemonLeft: 1 };
            stream.battle.start();
          }
        };
        return { omniscient, p1: new Stream(), p2: new Stream() };
      },
    },
    Teams: { pack: () => 'PACKED' },
  };
}
const session = createShowdownStreamSession(fakeShowdown(), {
  p1: { name: 'Mapless', team: [{ maplessId: 'hero', species: 'Pikachu', level: 1, hp: 10, maxhp: 10, status: '', heldItem: '', fainted: false, moves: [{ id: 'thunderbolt', pp: 10, maxpp: 10 }] }] },
  p2: { name: 'Wild', team: [{ maplessId: 'wild', species: 'Magikarp', level: 1, hp: 10, maxhp: 10, status: '', heldItem: '', fainted: false, moves: [{ id: 'splash', pp: 10, maxpp: 10 }] }] },
});
await session.start();
assert.deepEqual(session.resolvedState().p1.map(({ maplessId }) => maplessId), ['hero']);

const injected = pokemon('Pikachu', 'thunderbolt');
session.battleStream.battle.sides[0].pokemon.push(injected);
await assert.rejects(async () => session.resolvedState(), /cardinality diverged/, 'resolved projection must reject engine/canonical cardinality divergence before terminal persistence');

session.battleStream.battle.sides[0].pokemon.pop();
const original = session.battleStream.battle.sides[0].pokemon[0];
session.battleStream.battle.sides[0].pokemon.push(original);
await assert.rejects(async () => session.resolvedState(), /cardinality diverged/, 'duplicate engine member references must not be silently collapsed');
session.battleStream.battle.sides[0].pokemon.pop();

console.log('reconstruction Showdown resolved identity fail-closed smoke: ok');

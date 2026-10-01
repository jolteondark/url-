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
            stream.battle.sides[0] = { pokemon: [pokemon('Pikachu', 'thunderbolt'), pokemon('Eevee', 'tackle')], pokemonLeft: 2 };
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
  p1: { name: 'Mapless', team: [{ maplessId: 'hero', species: 'Pikachu', level: 1, hp: 10, maxhp: 10, status: '', heldItem: '', fainted: false, moves: [{ id: 'thunderbolt', pp: 10, maxpp: 10 }] }, { maplessId: 'bench', species: 'Eevee', level: 1, hp: 10, maxhp: 10, status: '', heldItem: '', fainted: false, moves: [{ id: 'tackle', pp: 10, maxpp: 10 }] }] },
  p2: { name: 'Wild', team: [{ maplessId: 'wild', species: 'Magikarp', level: 1, hp: 10, maxhp: 10, status: '', heldItem: '', fainted: false, moves: [{ id: 'splash', pp: 10, maxpp: 10 }] }] },
});
await session.start();
assert.deepEqual(session.resolvedState().p1.map(({ maplessId }) => maplessId), ['hero', 'bench']);

const side = session.battleStream.battle.sides[0];
const originalMembers = [...side.pokemon];

side.pokemon.push(pokemon('Eevee', 'tackle'));
await assert.rejects(async () => session.resolvedState(), /cardinality diverged/, 'resolved projection must reject engine/canonical cardinality divergence before terminal persistence');
side.pokemon = [...originalMembers];

side.pokemon = [originalMembers[0], originalMembers[0]];
await assert.rejects(async () => session.resolvedState(), /duplicate Mapless identity/, 'stable-cardinality duplicate engine identities must reach and trip the duplicate-identity guard');
side.pokemon = [...originalMembers];
assert.deepEqual(session.resolvedState().p1.map(({ maplessId }) => maplessId), ['hero', 'bench'], 'restoring authoritative members must restore canonical identity order');

console.log('reconstruction Showdown resolved identity fail-closed smoke: ok');

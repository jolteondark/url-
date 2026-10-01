import assert from 'node:assert/strict';
import { projectMaplessPokemonToShowdown, projectMaplessPartyToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const starter = {
  id: 'starter-eevee',
  species: 'Eevee',
  name: 'Eevee',
  level: 9,
  ability: 'Run Away',
  nature_id: 'HARDY',
  iv: zeroStats,
  ev: zeroStats,
  hp: 28,
  maxhp: 28,
  status: '',
  heldItem: '',
  fainted: false,
  moves: [{ id: 'tackle', pp: 35, maxpp: 35 }],
};
const projected = projectMaplessPokemonToShowdown(starter);
assert.equal(projected.nature, 'HARDY');
assert.deepEqual(projected.ivs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
assert.deepEqual(projected.evs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

assert.throws(
  () => projectMaplessPokemonToShowdown({ ...starter, iv: { ...zeroStats, HP: 32 } }),
  /IV hp must be an integer from 0 through 31/
);
assert.throws(
  () => projectMaplessPokemonToShowdown({ ...starter, ev: { HP: 0 } }),
  /EV requires all six stats/
);

const packed = [];
class Stream { async write() {} }
class BattleStream {}
const showdown = {
  BattleStreams: {
    BattleStream,
    getPlayerStreams() { return { omniscient: new Stream(), p1: new Stream(), p2: new Stream() }; },
  },
  Teams: {
    pack(team) { packed.push(structuredClone(team)); return 'PACKED'; },
  },
};
createShowdownStreamSession(showdown, {
  p1: { name: 'Mapless', team: projectMaplessPartyToShowdown([starter]) },
  p2: { name: 'Wild', team: projectMaplessPartyToShowdown([{
    id: 'wild-rattata', species: 'Rattata', level: 3, ability: 'Run Away',
    nature_id: 'HARDY', iv: zeroStats, ev: zeroStats,
    hp: 14, maxhp: 14, status: '', heldItem: '', fainted: false,
    moves: [{ id: 'tackle', pp: 35, maxpp: 35 }],
  }]) },
});
assert.equal(packed.length, 2);
assert.equal(packed[0][0].nature, 'HARDY');
assert.deepEqual(packed[0][0].ivs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
assert.deepEqual(packed[0][0].evs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
console.log('Showdown individual stat projection reaches Teams.pack: ok');

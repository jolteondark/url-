import assert from 'node:assert/strict';
import { projectMaplessPokemonToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';
import {
  MAPLESS_FRESH_STARTER,
  MAPLESS_FRESH_START_MONEY,
  createFreshRunState,
} from '../src-next/core/run/fresh-start.js';

const state = createFreshRunState({ runId: 'fresh-start-test', seed: 108 });
assert.equal(state.day, 1);
assert.equal(state.mode, 'board');
assert.equal(state.location, 'day_board');
assert.equal(state.money, MAPLESS_FRESH_START_MONEY);
assert.equal(state.money, 1000);
assert.equal(state.party.length, 1);
assert.deepEqual(state.party[0], MAPLESS_FRESH_STARTER);
assert.equal(state.party[0].species, 'Eevee');
assert.equal(state.party[0].level, 9);
assert.equal(state.party[0].exp, 990);
assert.equal(state.party[0].hp, 28);
assert.equal(state.party[0].maxhp, 28);
assert.equal(state.party[0].nature_id, 'HARDY');
assert.equal(state.party[0].ability_id, 'RUNAWAY');
assert.deepEqual(state.party[0].iv, { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });
assert.deepEqual(state.party[0].ev, { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });
assert.deepEqual(state.party[0].moves, [{ id: 'tackle', pp: 35, maxpp: 35, ppup: 0 }]);

const projected = projectMaplessPokemonToShowdown(state.party[0]);
assert.equal(projected.maxhp, 28);
assert.equal(projected.nature, 'HARDY');
assert.deepEqual(projected.ivs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
assert.deepEqual(projected.evs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
console.log('New Core Fresh Start canonical starter projection: ok');

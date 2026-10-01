import assert from 'node:assert/strict';
import { createFreshRunState } from '../src-next/core/run/fresh-start.js';
import { step } from '../src-next/core/step.js';
import { prepareNewCoreWildBoardSlot } from '../src-next/platform/p1-wild-encounter-driver.js';

let state = createFreshRunState({ runId: 'wild-driver', seed: 108 });
state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.equal(wildSlot, 2);
assert.equal(state.board[wildSlot].type, 'BUG');

let observed = null;
const dependencies = {
  encounterRuntime: {
    resolveSafariGeneralEncounter(input) {
      observed = structuredClone(input);
      assert.equal(input.requiredType, 'BUG');
      assert.equal(input.speciesIndex, 10);
      assert.equal(input.varianceIndex, 0);
      return {
        required_type: 'BUG',
        species_id: 'SPINARAK',
        species_name: 'Spinarak',
        base_level: 3,
        move_ids: ['POISONSTING'],
        variance: -1,
        min_level: 1,
        max_level: 100,
        resolved_level: 2,
        selection: { species_index: 10, variance_index: 0 },
      };
    },
  },
  speciesMasters: {
    SPINARAK: { id: 'SPINARAK', name: 'Spinarak', base_exp: 50, base_stats: { HP: 40 } },
  },
  moveMasters: {
    POISONSTING: { id: 'POISONSTING', total_pp: 35 },
  },
};

const rngBefore = state.rngState;
const prepared = await prepareNewCoreWildBoardSlot(state, wildSlot, dependencies);
assert.ok(observed);
assert.equal(prepared.prepared.rngStateBefore, rngBefore);
assert.notEqual(prepared.prepared.nextRngState, rngBefore);
assert.equal(prepared.prepared.selection.speciesId, 'SPINARAK');
assert.equal(prepared.prepared.selection.level, 2);
assert.equal(prepared.state.rngState, prepared.prepared.nextRngState);
assert.equal(prepared.state.board[wildSlot].encounter.species, 'SPINARAK');
assert.equal(prepared.state.board[wildSlot].encounter.level, 2);
assert.equal(prepared.state.board[wildSlot].encounter.baseExp, 50);
assert.equal(prepared.state.board[wildSlot].encounter.pokemon.maxhp, 13);
assert.deepEqual(prepared.state.board[wildSlot].encounter.pokemon.iv, {
  HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0,
});
assert.deepEqual(prepared.state.board[wildSlot].encounter.pokemon.moves, [
  { id: 'POISONSTING', pp: 35, maxpp: 35, ppup: 0 },
]);
await assert.rejects(
  () => prepareNewCoreWildBoardSlot(prepared.state, wildSlot, dependencies),
  /already prepared/,
  'prepared wild cells must not be rerolled'
);
assert.throws(
  () => step(prepared.state, {
    type: 'BOARD_ENCOUNTER_READY',
    slot: wildSlot,
    encounter: { species: 'OTHER' },
    rngStateBefore: rngBefore,
    nextRngState: rngBefore,
  }),
  /already prepared|RNG state is stale/
);
console.log('New Core browser wild encounter driver: ok');

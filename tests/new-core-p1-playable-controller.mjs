import assert from 'node:assert/strict';
import { createP1PlayableController } from '../src-next/platform/p1-playable-controller.js';

function memoryStorage(backing, counters) {
  return {
    getItem(key) {
      counters.get += 1;
      return backing.has(key) ? backing.get(key) : null;
    },
    setItem(key, value) {
      counters.set += 1;
      backing.set(key, String(value));
    },
    removeItem(key) {
      counters.remove += 1;
      backing.delete(key);
    },
  };
}

function fakeSessionFactory(_showdown, config) {
  let started = false;
  let turn = 0;
  function resolvedPlayer() {
    return config.p1.team.map((member) => ({
      maplessId: member.maplessId,
      hp: turn > 0 ? Math.max(1, member.hp - 1) : member.hp,
      maxhp: member.maxhp,
      status: member.status,
      heldItem: member.heldItem,
      fainted: false,
      moves: member.moves.map((move) => ({
        id: move.id,
        pp: turn > 0 ? Math.max(0, move.pp - 1) : move.pp,
        maxpp: move.maxpp,
      })),
    }));
  }
  function resolvedWild() {
    return config.p2.team.map((member) => ({
      maplessId: member.maplessId,
      hp: turn > 0 ? 0 : member.hp,
      maxhp: member.maxhp,
      status: '',
      heldItem: '',
      fainted: turn > 0,
      moves: member.moves.map((move) => ({ id: move.id, pp: move.pp, maxpp: move.maxpp })),
    }));
  }
  return {
    async start() { started = true; },
    async fight() {
      if (!started) throw new Error('not started');
      turn = 1;
    },
    resolvedState() {
      return {
        terminal: turn > 0,
        winner: turn > 0 ? 'Mapless' : '',
        turn,
        p1: resolvedPlayer(),
        p2: resolvedWild(),
      };
    },
  };
}

const encounterDependencies = {
  encounterRuntime: {
    resolveSafariGeneralEncounter(input) {
      assert.equal(input.requiredType, 'BUG');
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
        selection: { species_index: input.speciesIndex, variance_index: input.varianceIndex },
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

const backing = new Map();
const counters = { get: 0, set: 0, remove: 0 };
const storage = memoryStorage(backing, counters);
const controller = createP1PlayableController({
  storage,
  encounterDependencies,
  sessionFactory: fakeSessionFactory,
  battleSeed: [1, 2, 3, 4],
});

controller.freshStart({ runId: 'controller-smoke', seed: 108 });
let state = controller.snapshot();
assert.equal(state.day, 1);
assert.equal(state.party[0].species, 'Eevee');
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.equal(wildSlot, 2);
await controller.prepareWild(wildSlot);
await controller.startWildBattle(wildSlot);
const fight = await controller.fight(1);
assert.equal(fight.accepted, true);
assert.equal(fight.terminal, true);
assert.equal(fight.outcome, 'win');
assert.equal(controller.snapshot().mode, 'battle_result');
assert.equal(controller.snapshot().party[0].hp, 27);
assert.equal(controller.snapshot().party[0].moves[0].pp, 34);

controller.commitReward(['1']);
state = controller.snapshot();
assert.equal(state.mode, 'board');
assert.equal(state.party[0].exp, 992);
assert.equal(state.bag.items.POTION, 1);
assert.equal(counters.set, 1, 'reward commit owns one browser save');

controller.advanceDay({ transitionId: 'controller-day-1-next', confirmed: true });
state = controller.snapshot();
assert.equal(state.day, 2);
assert.equal(state.mode, 'board');
assert.equal(state.board.length, 8);
assert.equal(counters.set, 2, 'settled day transition owns one additional browser save');

const continued = createP1PlayableController({
  storage: memoryStorage(backing, counters),
  encounterDependencies,
  sessionFactory: fakeSessionFactory,
});
const load = continued.continueRun();
assert.equal(load.found, true);
assert.deepEqual(continued.snapshot(), state, 'new page Continue must restore the exact settled canonical state');

const queuedTypes = controller.presentationQueue.jobs.map((job) => job.event.type);
assert.ok(queuedTypes.includes('BATTLE_STARTED'));
assert.ok(queuedTypes.includes('BATTLE_WON'));
assert.ok(queuedTypes.includes('EXP_GAINED'));
assert.ok(queuedTypes.includes('ITEM_REWARDED'));
assert.equal(controller.actionGate.accepted, 1);
assert.equal(controller.actionGate.completed, 1);
console.log('New Core P1 playable controller seam: ok');

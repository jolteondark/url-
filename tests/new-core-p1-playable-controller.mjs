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

let seenBattleSeed = null;
let seenFoeMoveSlot = null;
function fakeSessionFactory(_showdown, config) {
  seenBattleSeed = structuredClone(config.seed);
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
      moves: member.moves.map((move) => ({
        id: move.id,
        pp: turn > 0 ? Math.max(0, move.pp - 1) : move.pp,
        maxpp: move.maxpp,
      })),
    }));
  }
  return {
    async start() { started = true; },
    async fight(side, moveSlot) {
      if (!started) throw new Error('not started');
      if (side === 'p2') seenFoeMoveSlot = moveSlot;
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
});

controller.freshStart({ runId: 'controller-smoke', seed: 108 });
let state = controller.snapshot();
assert.equal(state.day, 1);
assert.equal(state.party[0].species, 'Eevee');
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.equal(wildSlot, 2);
await controller.prepareWild(wildSlot);
const rngBeforeBattle = controller.snapshot().rngState;
const started = await controller.startWildBattle(wildSlot);
assert.equal(started.seed.length, 4);
assert.deepEqual(started.seed, seenBattleSeed);
assert.notEqual(controller.snapshot().rngState, rngBeforeBattle, 'Showdown seed derivation must advance gameplay RNG');
assert.deepEqual(controller.activeBattle().seed, seenBattleSeed);

const rngBeforeFight = controller.snapshot().rngState;
const fight = await controller.fight(1);
assert.equal(fight.accepted, true);
assert.equal(fight.terminal, true);
assert.equal(fight.outcome, 'win');
assert.equal(fight.opponentChoice.command, 'move');
assert.equal(fight.opponentChoice.moveSlot, 1);
assert.equal(seenFoeMoveSlot, 1);
assert.notEqual(controller.snapshot().rngState, rngBeforeFight, 'wild AI move selection must advance gameplay RNG');
assert.equal(controller.activeBattle(), null);
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
const settledDay2 = controller.snapshot();
controller.advanceDay({ transitionId: 'controller-day-1-next', confirmed: true });
assert.deepEqual(controller.snapshot(), settledDay2, 'replayed day transition must not regenerate the Board or consume RNG');
assert.equal(counters.set, 2, 'replayed day transition must not write another save');

const continued = createP1PlayableController({
  storage: memoryStorage(backing, counters),
  encounterDependencies,
  sessionFactory: fakeSessionFactory,
});
const load = continued.continueRun();
assert.equal(load.found, true);
assert.deepEqual(continued.snapshot(), state, 'new page Continue must restore the exact settled canonical state');

const queuedTypes = controller.presentationQueue.jobs.map((job) => job.event.type);
for (const required of [
  'BATTLE_STARTED',
  'POKEMON_SENT_OUT',
  'MOVE_USED',
  'DAMAGE_APPLIED',
  'POKEMON_FAINTED',
  'BATTLE_WON',
  'EXP_GAINED',
  'ITEM_REWARDED',
]) {
  assert.ok(queuedTypes.includes(required), `presentation queue missing ${required}`);
}
assert.equal(controller.actionGate.accepted, 1);
assert.equal(controller.actionGate.completed, 1);

const failedStart = createP1PlayableController({
  encounterDependencies,
  sessionFactory() {
    return {
      async start() { throw new Error('simulated Showdown start failure'); },
      async fight() {},
      resolvedState() { return { terminal: false, winner: '', turn: 0, p1: [], p2: [] }; },
    };
  },
});
failedStart.freshStart({ runId: 'controller-start-failure', seed: 108 });
const failedWildSlot = failedStart.snapshot().board.findIndex((slot) => slot.kind === 'wild');
await failedStart.prepareWild(failedWildSlot);
const preparedBoard = failedStart.snapshot();
const queuedBeforeFailure = failedStart.presentationQueue.jobs.length;
await assert.rejects(
  () => failedStart.startWildBattle(failedWildSlot),
  /simulated Showdown start failure/
);
assert.deepEqual(failedStart.snapshot(), preparedBoard, 'failed Showdown start must roll back selection and battle RNG');
assert.equal(failedStart.presentationQueue.jobs.length, queuedBeforeFailure, 'failed Showdown start must not publish stale battle-request events');

console.log('New Core P1 playable controller seam: ok');

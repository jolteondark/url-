import assert from 'node:assert/strict';
import { createP1PlayableController } from '../src-next/platform/p1-playable-controller.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const encounterDependencies = {
  encounterRuntime: {
    resolveSafariGeneralEncounter(input) {
      return {
        required_type: input.requiredType,
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

function deterministicSessionFactory(trace) {
  return (_showdown, config) => {
    trace.battleSeed = [...config.seed];
    let started = false;
    let turn = 0;
    let pending = new Set();
    const p1 = structuredClone(config.p1.team);
    const p2 = structuredClone(config.p2.team);

    function project(member) {
      return {
        maplessId: member.maplessId,
        hp: member.hp,
        maxhp: member.maxhp,
        status: member.status,
        heldItem: member.heldItem,
        fainted: member.fainted,
        moves: member.moves.map((move) => ({ id: move.id, pp: move.pp, maxpp: move.maxpp })),
      };
    }

    return {
      async start() { started = true; },
      async fight(side, moveSlot) {
        if (!started) throw new Error('not started');
        trace.commands.push({ side, moveSlot });
        pending.add(side);
        if (pending.size !== 2) return;
        pending = new Set();
        turn += 1;
        p1[0].hp = Math.max(1, p1[0].hp - 1);
        p1[0].moves[0].pp -= 1;
        p2[0].hp = 0;
        p2[0].fainted = true;
        p2[0].moves[0].pp -= 1;
      },
      resolvedState() {
        return {
          terminal: turn > 0,
          winner: turn > 0 ? 'Mapless' : '',
          turn,
          p1: p1.map(project),
          p2: p2.map(project),
        };
      },
    };
  };
}

async function runOnce() {
  const trace = { battleSeed: null, commands: [] };
  const storage = memoryStorage();
  const controller = createP1PlayableController({
    storage,
    encounterDependencies,
    sessionFactory: deterministicSessionFactory(trace),
  });

  controller.freshStart({ runId: 'deterministic-replay', seed: 108 });
  const wildSlot = controller.snapshot().board.findIndex((slot) => slot.kind === 'wild');
  await controller.prepareWild(wildSlot);
  const started = await controller.startWildBattle(wildSlot);
  const fight = await controller.fight(1);
  assert.equal(fight.terminal, true);
  controller.commitReward();
  controller.advanceDay({ transitionId: 'deterministic-replay:day-1-next', confirmed: true });
  const settled = controller.snapshot();

  const continued = createP1PlayableController({
    storage,
    encounterDependencies,
    sessionFactory: deterministicSessionFactory({ battleSeed: null, commands: [] }),
  });
  const loaded = continued.continueRun();
  assert.equal(loaded.found, true);
  assert.deepEqual(continued.snapshot(), settled);

  return {
    state: settled,
    wildSlot,
    showdownSeed: started.seed,
    opponentChoice: {
      command: fight.opponentChoice.command,
      moveIndex: fight.opponentChoice.moveIndex,
      moveSlot: fight.opponentChoice.moveSlot,
      moveId: fight.opponentChoice.moveId,
      nextRngState: fight.opponentChoice.nextRngState,
    },
    commands: trace.commands,
    presentation: controller.presentationQueue.jobs.map((job) => structuredClone(job.event)),
  };
}

const first = await runOnce();
const second = await runOnce();
assert.deepEqual(second, first, 'same run seed and player command sequence must replay the full P1 vertical exactly');
assert.equal(first.state.day, 2);
assert.equal(first.state.party[0].exp, 992);
assert.equal(first.state.bag.items.POTION, 1);
assert.equal(first.showdownSeed.length, 4);
assert.deepEqual(first.commands.map((entry) => entry.side), ['p1', 'p2']);
console.log('New Core P1 full deterministic replay: ok');

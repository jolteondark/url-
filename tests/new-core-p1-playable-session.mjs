import assert from 'node:assert/strict';
import { createP1PlayableSession } from '../src-next/platform/p1-playable-session.js';

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

function fakeBattleSessionFactory(_showdown, config) {
  let terminal = false;
  let winner = '';
  const p1 = structuredClone(config.p1.team);
  const p2 = structuredClone(config.p2.team);
  let pending = new Set();
  function resolved(member) {
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
    async start() { return true; },
    async fight(side, moveSlot) {
      assert.equal(moveSlot, 1);
      pending.add(side);
      if (pending.size === 2) {
        pending = new Set();
        p1[0].hp = 25;
        p1[0].moves[0].pp = 34;
        p2[0].hp = 0;
        p2[0].fainted = true;
        p2[0].moves[0].pp = 34;
        terminal = true;
        winner = 'Mapless';
      }
    },
    resolvedState() {
      return {
        terminal,
        winner,
        turn: terminal ? 1 : 0,
        p1: p1.map(resolved),
        p2: p2.map(resolved),
      };
    },
  };
}

const saves = [];
const session = createP1PlayableSession({
  battleSessionFactory: fakeBattleSessionFactory,
  encounterDependencies,
  now: (() => { let now = 0; return () => ++now; })(),
  saveStore: {
    async write(serialized, reason) { saves.push({ serialized, reason }); },
  },
});

let snap = await session.freshStart({ runId: 'p1-session', seed: 108 });
assert.equal(snap.state.party[0].species, 'Eevee');
assert.equal(snap.state.money, 1000);
const wildSlot = snap.state.board.findIndex((slot) => slot.kind === 'wild');
assert.equal(wildSlot, 2);
assert.equal(snap.state.board[wildSlot].type, 'BUG');

await session.prepareWild(wildSlot);
snap = await session.selectWild(wildSlot);
assert.equal(snap.battle.id, 'p1-session:d1:s2');
assert.equal(snap.state.mode, 'battle_pending');
assert.equal(snap.battle.encounter.species, 'SPINARAK');
assert.equal(snap.battle.seed.length, 4);

const fight = await session.fight(1);
assert.equal(fight.accepted, true);
assert.equal(fight.terminal, true);
snap = session.snapshot();
assert.equal(snap.state.mode, 'battle_result');
assert.equal(snap.state.party[0].hp, 25);
assert.equal(snap.state.party[0].moves[0].pp, 34);
assert.equal(snap.actionGate.accepted, 1);
assert.equal(snap.actionGate.completed, 1);

await session.commitReward(['1']);
snap = session.snapshot();
assert.equal(snap.state.mode, 'board');
assert.equal(snap.state.party[0].exp, 992);
assert.equal(snap.state.bag.items.POTION, 1);
assert.equal(saves.length, 1);
assert.equal(saves[0].reason, 'battle_reward_result');

await session.advanceDay(true);
snap = session.snapshot();
assert.equal(snap.state.day, 2);
assert.equal(snap.state.mode, 'board');
assert.equal(snap.state.board.length, 8);
assert.equal(saves.length, 2, 'day advance must save once, after the next Board exists');
assert.equal(saves[1].reason, 'day_advanced');
assert.equal(saves[1].serialized, session.serialize());

const types = snap.presentation.jobs.map((job) => job.type);
for (const required of ['BOARD_READY','BATTLE_STARTED','MOVE_USED','DAMAGE_APPLIED','POKEMON_FAINTED','BATTLE_WON','EXP_GAINED','ITEM_REWARDED']) {
  assert.ok(types.includes(required), `presentation queue missing ${required}`);
}

const continued = createP1PlayableSession({
  battleSessionFactory: fakeBattleSessionFactory,
  encounterDependencies,
  saveStore: { async write() {} },
});
const continuedSnap = await continued.continueFrom(session.serialize());
assert.deepEqual(continuedSnap.state, snap.state);
assert.equal(continuedSnap.state.day, 2);
assert.equal(continuedSnap.state.party[0].hp, 25);
assert.equal(continuedSnap.state.party[0].moves[0].pp, 34);
assert.equal(continuedSnap.state.party[0].exp, 992);
assert.equal(continuedSnap.state.bag.items.POTION, 1);

console.log('P1 playable session pure vertical: ok');

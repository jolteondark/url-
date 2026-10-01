import assert from 'node:assert/strict';
import { createFreshRunState } from '../src-next/core/run/fresh-start.js';
import { step } from '../src-next/core/step.js';
import { resolveP1CanonicalBattleSprite } from '../src-next/presentation/assets/p1-battle-sprites.js';
import { projectP1BattleView, projectP1BoardView } from '../src-next/presentation/battle/p1-pixel-view.js';

const eevee = resolveP1CanonicalBattleSprite({ species: 'Eevee', side: 'player' });
assert.equal(eevee.species, 'EEVEE');
assert.equal(eevee.canonicalPath, 'Graphics/Pokemon/Back/EEVEE.png');
assert.match(eevee.src, /^data:image\/png;base64,/);

const spinarak = resolveP1CanonicalBattleSprite({ species: 'Spinarak', side: 'foe' });
assert.equal(spinarak.species, 'SPINARAK');
assert.equal(spinarak.canonicalPath, 'Graphics/Pokemon/Front/SPINARAK.png');
assert.match(spinarak.src, /^data:image\/png;base64,/);
assert.equal(resolveP1CanonicalBattleSprite({ species: 'MISSINGNO_TEST', side: 'foe' }), null);

let state = createFreshRunState({ runId: 'pixel-view', seed: 108 });
state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
const board = projectP1BoardView(state);
assert.equal(board.visible, true);
assert.equal(board.day, 1);
assert.equal(board.money, 1000);
assert.equal(board.slots.length, 8);
assert.equal(board.slots.filter((slot) => slot.kind === 'next_day').length, 1);
const wildSlot = board.slots.find((slot) => slot.kind === 'wild');
assert.equal(wildSlot.type, 'BUG');
assert.equal(wildSlot.enabled, true);

state = step(state, {
  type: 'BOARD_ENCOUNTER_READY',
  slot: wildSlot.index,
  encounter: {
    species: 'SPINARAK',
    speciesName: 'Spinarak',
    type: 'BUG',
    level: 2,
    baseExp: 50,
    pokemon: {
      id: 'wild:spinarak',
      species: 'SPINARAK',
      name: 'Spinarak',
      level: 2,
      hp: 13,
      maxhp: 13,
      status: '',
      heldItem: '',
      fainted: false,
      moves: [{ id: 'poisonsting', pp: 35, maxpp: 35 }],
    },
  },
}).state;
state = step(state, { type: 'BOARD_SELECT', slot: wildSlot.index }).state;
const activeBattle = {
  battleId: state.activeBattle.id,
  encounter: state.activeEncounter.encounter,
  seed: [1, 2, 3, 4],
};
const resolved = {
  terminal: false,
  winner: '',
  turn: 0,
  p1: [{ maplessId: '1', hp: 28, maxhp: 28, status: '', heldItem: '', fainted: false, moves: [{ id: 'tackle', pp: 35, maxpp: 35 }] }],
  p2: [{ maplessId: 'wild:spinarak', hp: 13, maxhp: 13, status: '', heldItem: '', fainted: false, moves: [{ id: 'poisonsting', pp: 35, maxpp: 35 }] }],
};
const battle = projectP1BattleView({ state, resolved, activeBattle });
assert.equal(battle.visible, true);
assert.equal(battle.commandEnabled, true);
assert.equal(battle.player.species, 'Eevee');
assert.equal(battle.player.sprite.canonicalPath, 'Graphics/Pokemon/Back/EEVEE.png');
assert.equal(battle.foe.species, 'SPINARAK');
assert.equal(battle.foe.sprite.canonicalPath, 'Graphics/Pokemon/Front/SPINARAK.png');
assert.equal(battle.player.hpRatio, 1);
assert.equal(battle.foe.hpRatio, 1);
assert.deepEqual(battle.player.moves[0], { id: 'tackle', pp: 35, maxpp: 35 });

console.log('P1 pixel-art view projection and canonical sprites: ok');

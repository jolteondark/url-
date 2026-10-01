import { createInitialGameState } from '../game-state.js';

export const MAPLESS_FRESH_START_MONEY = 1000;
export const MAPLESS_FRESH_STARTER = Object.freeze({
  id: '1',
  personalId: 1,
  species: 'Eevee',
  name: 'Eevee',
  level: 9,
  ability: 'Run Away',
  ability_id: 'RUNAWAY',
  nature_id: 'HARDY',
  iv: Object.freeze({ HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 }),
  ev: Object.freeze({ HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 }),
  exp: 990,
  hp: 28,
  maxhp: 28,
  status: '',
  heldItem: '',
  fainted: false,
  moves: Object.freeze([Object.freeze({ id: 'tackle', pp: 35, maxpp: 35, ppup: 0 })]),
});

export function createFreshRunState({ runId, seed } = {}) {
  return createInitialGameState({
    runId,
    seed,
    money: MAPLESS_FRESH_START_MONEY,
    party: [structuredClone(MAPLESS_FRESH_STARTER)],
    bag: { items: {}, maxSlots: 20, maxPerSlot: 99 },
  });
}

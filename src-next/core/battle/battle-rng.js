import { randomInt } from '../rng.js';

export function drawShowdownBattleSeed(rngState) {
  let state = Number(rngState) >>> 0;
  const seed = [];
  for (let index = 0; index < 4; index += 1) {
    const draw = randomInt(state, 0x10000);
    state = draw.nextState;
    seed.push(draw.value);
  }
  return Object.freeze({ seed: Object.freeze(seed), nextRngState: state });
}

export function drawWildShowdownMove(rngState, moves = []) {
  if (!Array.isArray(moves) || moves.length === 0) throw new Error('wild AI requires at least one move');
  const legal = moves.flatMap((move, index) => Number(move?.pp ?? 0) > 0
    ? [{ moveIndex: index, moveSlot: index + 1, moveId: String(move?.id ?? move?.move ?? '') }]
    : []);
  if (!legal.length) {
    return Object.freeze({
      command: 'struggle',
      moveIndex: 0,
      moveSlot: 1,
      moveId: 'struggle',
      nextRngState: Number(rngState) >>> 0,
    });
  }
  const draw = randomInt(Number(rngState) >>> 0, legal.length);
  const selected = legal[draw.value];
  return Object.freeze({
    command: 'move',
    ...selected,
    nextRngState: draw.nextState,
  });
}

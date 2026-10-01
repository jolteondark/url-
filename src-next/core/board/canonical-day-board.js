import { randomInt } from '../rng.js';

export const MAPLESS_V108_EXTRA_EVENT_WEIGHTS = Object.freeze({
  wild: 5,
  trainer: 2,
  center: 1,
  shop: 3,
  egg_shop: 2,
  miner: 2,
  delta_exchange: 2,
  type_event: 3,
  house: 3,
  tavern: 2,
  normal_event: 4,
  treasure: 3,
  trap: 3,
  buried_item: 2,
});

export function weightedBoardKindV108(weights, roll) {
  const entries = Object.entries(weights).filter(([, weight]) => Number.isInteger(weight) && weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!Number.isInteger(roll) || roll < 0 || roll >= total) throw new RangeError(`weighted board roll must be 0..${total - 1}`);
  let remaining = roll;
  for (const [kind, weight] of entries) {
    remaining -= weight;
    if (remaining < 0) return kind;
  }
  throw new Error('weighted board selection exhausted unexpectedly');
}

function draw(state, maxExclusive) {
  const result = randomInt(state, maxExclusive);
  return { value: result.value, state: result.nextState };
}

export function generateCanonicalDayBoard(state, day) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError('day must be >= 1');
  let rngState = Number(state) >>> 0;
  const board = ['next_day', 'wild', 'trainer'];
  const available = { ...MAPLESS_V108_EXTRA_EVENT_WEIGHTS };
  const extraRolls = [];
  const selectedExtraKinds = [];
  const randomTrace = [];

  for (let index = 0; index < 5; index += 1) {
    const total = Object.values(available).reduce((sum, weight) => sum + weight, 0);
    const rolled = draw(rngState, total);
    rngState = rolled.state;
    const kind = weightedBoardKindV108(available, rolled.value);
    extraRolls.push(rolled.value);
    selectedExtraKinds.push(kind);
    randomTrace.push({ index, limit: total, roll: rolled.value, kind });
    board.push(kind);
    if (kind !== 'wild' && kind !== 'trainer') delete available[kind];
  }

  const shuffleOrder = Array.from({ length: 8 }, (_, index) => index);
  for (let index = shuffleOrder.length - 1; index > 0; index -= 1) {
    const rolled = draw(rngState, index + 1);
    rngState = rolled.state;
    [shuffleOrder[index], shuffleOrder[rolled.value]] = [shuffleOrder[rolled.value], shuffleOrder[index]];
  }

  const kinds = shuffleOrder.map((index) => board[index]);
  if (kinds.filter((kind) => kind === 'next_day').length !== 1) throw new Error('canonical board requires exactly one next_day slot');
  if (!kinds.includes('wild') || !kinds.includes('trainer')) throw new Error('canonical board requires guaranteed wild and trainer slots');
  const nonRepeatable = selectedExtraKinds.filter((kind) => kind !== 'wild' && kind !== 'trainer');
  if (new Set(nonRepeatable).size !== nonRepeatable.length) throw new Error('canonical board repeated a non-repeatable optional kind');

  return Object.freeze({
    day,
    nextRngState: rngState,
    slots: Object.freeze(kinds.map((kind) => Object.freeze({ kind }))),
    decisions: Object.freeze({
      extraRolls: Object.freeze(extraRolls),
      shuffleOrder: Object.freeze(shuffleOrder),
      selectedExtraKinds: Object.freeze(selectedExtraKinds),
      randomTrace: Object.freeze(randomTrace.map((entry) => Object.freeze(entry))),
    }),
  });
}

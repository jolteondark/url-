import {
  MAPLESS_V108_EXTRA_EVENT_WEIGHTS,
  generateCanonicalDayBoardV108,
  weightedBoardKindV108,
} from "./mapless-canonical-board-generation-v108.js";

function nextSeed(seed) {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

function deterministicDecisions(day) {
  let seed = (Math.imul(day >>> 0, 0x9e3779b1) ^ 0xa511e9b3) >>> 0;
  const available = { ...MAPLESS_V108_EXTRA_EVENT_WEIGHTS };
  const extraRolls = [];
  for (let i = 0; i < 5; i += 1) {
    seed = nextSeed(seed);
    const total = Object.values(available).reduce((sum, weight) => sum + weight, 0);
    const roll = seed % total;
    extraRolls.push(roll);
    const kind = weightedBoardKindV108(available, roll);
    if (kind !== "wild" && kind !== "trainer") delete available[kind];
  }

  const shuffleOrder = Array.from({ length: 8 }, (_, index) => index);
  for (let i = shuffleOrder.length - 1; i > 0; i -= 1) {
    seed = nextSeed(seed);
    const j = seed % (i + 1);
    [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
  }
  return { extraRolls, shuffleOrder };
}

export function assembleDayBoard({ day }) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  const decisions = deterministicDecisions(day);
  const board = generateCanonicalDayBoardV108({ day, ...decisions });
  return {
    day: board.day,
    board_kinds: board.board_kinds,
    board_revealed: board.board_revealed,
    board_consumed: board.board_consumed,
    board_visited: board.board_visited,
    selected_extra_kinds: board.selected_extra_kinds,
    random_trace: board.random_trace,
  };
}

import { assembleDayBoard } from "./mapless-day-board-generation.js";
import { SAFARI_GENERAL_TYPES } from "./safari-general-encounter-runtime.js";

const PRE_SHUFFLE_KINDS = Object.freeze(["center", "shop", "egg_shop", "wild", "wild", "trainer", "trainer"]);
const GENERATION_DECISIONS = Object.freeze([
  { shuffle_order: [3, 0, 5, 1, 4, 2, 6], next_day_index: 7 },
  { shuffle_order: [6, 4, 1, 3, 0, 5, 2], next_day_index: 2 },
  { shuffle_order: [2, 5, 3, 0, 6, 4, 1], next_day_index: 5 },
  { shuffle_order: [4, 1, 6, 2, 5, 0, 3], next_day_index: 0 },
]);

function randomBelow(max) {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const limit = Math.floor(0x100000000 / max) * max;
    const out = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(out); while (out[0] >= limit);
    return out[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function generationForDay(day) {
  const decision = GENERATION_DECISIONS[(Math.max(1, Number(day)) - 1) % GENERATION_DECISIONS.length];
  return {
    pre_shuffle_kinds: [...PRE_SHUFFLE_KINDS],
    shuffle_order: [...decision.shuffle_order],
    next_day_index: decision.next_day_index,
  };
}

function wildTypeFor(day, ordinal) {
  return SAFARI_GENERAL_TYPES[((Math.max(1, Number(day)) - 1) * 2 + ordinal) % SAFARI_GENERAL_TYPES.length];
}

export function createSafariPostBoundaryBoard(day) {
  const floor = Math.max(1, Math.trunc(Number(day)));
  const board = assembleDayBoard({ day: floor, ...generationForDay(floor) });
  let wildOrdinal = 0;
  const events = board.board_kinds.map((kind, slot) => {
    if (kind === "wild") return { kind, type: wildTypeFor(floor, wildOrdinal++), slot };
    if (kind === "trainer") {
      const seed = ((Math.imul(floor, 1_000_003) ^ Math.imul(slot + 1, 97_409) ^ randomBelow(0x7fffffff)) & 0x7fffffff) >>> 0;
      return { kind, trainer_seed: seed, slot };
    }
    return { kind, slot };
  });
  return {
    day: floor,
    board_events: events,
    board_revealed: [...board.board_revealed],
    board_consumed: [...board.board_consumed],
    board_visited: Array(8).fill(false),
  };
}

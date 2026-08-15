export function assembleDayBoard({ day, pre_shuffle_kinds, shuffle_order, next_day_index }) {
  const kinds = [...pre_shuffle_kinds];
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  if (kinds.length !== 7) throw new RangeError("pre_shuffle_kinds must contain 7 events");
  const count = (kind) => kinds.filter((x) => x === kind).length;
  if (count("center") !== 1 || count("shop") !== 1 || count("egg_shop") !== 1) {
    throw new Error("center/shop/egg_shop must each occur exactly once");
  }
  const randomKinds = kinds.filter((x) => x === "wild" || x === "trainer");
  if (randomKinds.length !== 4 || kinds.some((x) => !["center", "shop", "egg_shop", "wild", "trainer"].includes(x))) {
    throw new Error("remaining four events must be wild/trainer");
  }
  if (!Array.isArray(shuffle_order) || shuffle_order.length !== 7 ||
      [...shuffle_order].sort((a, b) => a - b).some((v, i) => v !== i)) {
    throw new Error("shuffle_order must be a permutation of 0..6");
  }
  if (!Number.isInteger(next_day_index) || next_day_index < 0 || next_day_index >= 8) {
    throw new RangeError("next_day_index must be 0..7");
  }
  const shuffled = shuffle_order.map((i) => kinds[i]);
  const board = [];
  let eventIndex = 0;
  for (let index = 0; index < 8; index += 1) {
    if (index === next_day_index) board.push("next_day");
    else board.push(shuffled[eventIndex++]);
  }
  return {
    day,
    board_kinds: board,
    board_revealed: Array(8).fill(false),
    board_consumed: Array(8).fill(false)
  };
}

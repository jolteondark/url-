export const MAPLESS_V108_BOARD_SOURCE_SHA256 = Object.freeze({
  expedition: "64edadb9627ceeae83f15ba94a6d5f29ba46af266b1c09cbe8145093c8efcecc",
  houseTavern: "5f00423d808935381bd85a136dac077e9793d192d5e292199a0dc0954e350221",
  normalEvents: "8da6e70e8714e98a3a8c7bcfb1d956eebda377bc2dfe39f00e53da3a31a36bfa",
  treasure: "e7fee599b57fbdd22437c0964b00c6a61e815b8edb3a7a685e52d8e18409fb2e",
  combatPaths: "9a3b6dc9e8c2920f96ec419a4e9c948b47145aaf939dff1e6b1f3e06d5fa75d9",
  traps: "8f2bcbcb574dfd578424a9aecc41d0aaba95f59c94ae225cfd193d3d6a19a580",
  villageFloor: "8cfbd2a58a6724bd95147c77b4ce2b9c85d8cf27bf8c8c686b4a3a7b467718bb",
  buriedItem: "73727d7afa080d8413d3cbbcd69cfc63295f76a4570e7f5574c7a76fd804d4df",
});

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

function requireRoll(roll, limit, label) {
  if (!Number.isInteger(roll) || roll < 0 || roll >= limit) throw new RangeError(`${label} must be 0..${limit - 1}`);
  return roll;
}

export function weightedBoardKindV108(weights, roll) {
  const entries = Object.entries(weights).filter(([, weight]) => Number.isInteger(weight) && weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let remaining = requireRoll(roll, total, "weighted board roll");
  for (const [kind, weight] of entries) {
    remaining -= weight;
    if (remaining < 0) return kind;
  }
  throw new Error("weighted board selection exhausted unexpectedly");
}

function makeEvent(kind, factories, context) {
  const factory = factories?.[kind];
  if (typeof factory === "function") return factory(context);
  return { kind, type: null };
}

export function generateCanonicalDayBoardV108({ day, extraRolls, shuffleOrder, factories = {} } = {}) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  if (!Array.isArray(extraRolls) || extraRolls.length !== 5) throw new RangeError("extraRolls must contain exactly 5 bounded rolls");
  const board = [
    makeEvent("next_day", factories, { day, slot: "guaranteed" }),
    makeEvent("wild", factories, { day, slot: "guaranteed" }),
    makeEvent("trainer", factories, { day, slot: "guaranteed" }),
  ];
  const available = { ...MAPLESS_V108_EXTRA_EVENT_WEIGHTS };
  const selectedExtraKinds = [];
  const randomTrace = [];
  for (let index = 0; index < 5; index += 1) {
    const total = Object.values(available).reduce((sum, weight) => sum + weight, 0);
    const roll = requireRoll(extraRolls[index], total, `extraRolls[${index}]`);
    const kind = weightedBoardKindV108(available, roll);
    randomTrace.push({ index, limit: total, roll, kind });
    selectedExtraKinds.push(kind);
    board.push(makeEvent(kind, factories, { day, slot: "optional", optionalIndex: index }));
    if (kind !== "wild" && kind !== "trainer") delete available[kind];
  }
  if (!Array.isArray(shuffleOrder) || shuffleOrder.length !== 8 || [...shuffleOrder].sort((a, b) => a - b).some((value, index) => value !== index)) {
    throw new RangeError("shuffleOrder must be a permutation of 0..7");
  }
  const events = shuffleOrder.map((index) => board[index]);
  const kinds = events.map((event) => event.kind);
  if (kinds.filter((kind) => kind === "next_day").length !== 1 || kinds.filter((kind) => kind === "wild").length < 1 || kinds.filter((kind) => kind === "trainer").length < 1) {
    throw new Error("canonical board guarantees were violated");
  }
  const nonRepeatable = selectedExtraKinds.filter((kind) => kind !== "wild" && kind !== "trainer");
  if (new Set(nonRepeatable).size !== nonRepeatable.length) throw new Error("non-repeatable optional board kind was selected more than once");
  return { day, events, board_kinds: kinds, board_revealed: Array(8).fill(false), board_visited: Array(8).fill(false), board_consumed: Array(8).fill(false), selected_extra_kinds: selectedExtraKinds, random_trace: randomTrace };
}

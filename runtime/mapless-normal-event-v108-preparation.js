export const MAPLESS_V108_NORMAL_EVENT_WEIGHTS = Object.freeze({
  flooded_river: 6,
  burning_wagon: 6,
  mushroom_field: 6,
  hot_spring: 6,
  meteor_fragment: 2,
  honey_tree: 6,
  lost_pokemon: 6,
  sleeping_giant: 2,
  pokemon_nest: 6,
  berry_thief: 2,
  photographer: 6,
  traveling_cook: 6,
  street_performer: 6,
  lost_bag: 6,
  fake_nurse: 6,
  berry_juice_shop: 6,
  item_collector: 6,
  wishing_fountain: 2,
  old_statue: 2,
  auction: 1,
  trainer_camp: 6,
  berry_contest: 6,
  evolution_lab: 1,
  treasure_map_seller: 2,
  bounty_poster: 2,
  crumbling_bridge: 6,
  wounded_pokemon: 6,
  machine_gacha: 6,
  bloodline_grandmother: 6,
  retired_warrior: 6,
});

export const MAPLESS_V108_MACHINE_ITEM_IDS = Object.freeze(Array.from({ length: 100 }, (_, i) => `TM${String(i + 1).padStart(2, "0")}`));

function nextSeed(seed) {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

function seedFor(day, index) {
  return (Math.imul(Math.max(1, day) >>> 0, 0x9e3779b1) ^ Math.imul((index + 1) >>> 0, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0;
}

function weightedEvent(weights, roll) {
  const entries = Object.entries(weights).filter(([, weight]) => Number(weight) > 0);
  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  if (!Number.isInteger(roll) || roll < 0 || roll >= total) throw new RangeError("normal event roll is out of range");
  let remaining = roll;
  for (const [id, weight] of entries) {
    remaining -= Number(weight);
    if (remaining < 0) return id;
  }
  throw new Error("normal event weighted selection exhausted");
}

function shuffledMachineStock(seed) {
  const stock = [...MAPLESS_V108_MACHINE_ITEM_IDS];
  let state = seed >>> 0;
  for (let i = stock.length - 1; i > 0; i -= 1) {
    state = nextSeed(state);
    const j = state % (i + 1);
    [stock[i], stock[j]] = [stock[j], stock[i]];
  }
  return stock;
}

export function prepareSafariNormalEventV108(event, { day, index, partyFull = false } = {}) {
  if (!event || event.kind !== "normal_event") return event;
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new RangeError("index must be 0..7");
  let seed = Number.isInteger(event.normal_seed) ? (event.normal_seed >>> 0) : seedFor(day, index);
  const weights = { ...MAPLESS_V108_NORMAL_EVENT_WEIGHTS };
  if (partyFull) delete weights.wounded_pokemon;
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  seed = nextSeed(seed);
  const normalEventId = event.normal_event_id && weights[event.normal_event_id]
    ? event.normal_event_id
    : weightedEvent(weights, seed % total);
  const normalData = { ...(event.normal_data ?? {}) };
  if (normalEventId === "machine_gacha") {
    normalData.machine_stock ??= shuffledMachineStock(seed);
    normalData.machine_index = Number.isInteger(normalData.machine_index) ? normalData.machine_index : 0;
  }
  if (normalEventId === "bloodline_grandmother" || normalEventId === "retired_warrior") {
    seed = nextSeed(seed);
    normalData.teacher_seed ??= seed & 0x7fffffff;
  }
  return {
    ...event,
    normal_event_id: normalEventId,
    normal_seed: seed & 0x7fffffff,
    normal_resolved: Boolean(event.normal_resolved),
    normal_data: normalData,
  };
}

export function hydrateSafariNormalEventCells(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || !Array.isArray(state.board_events)) return runtime;
  const partyFull = Array.isArray(runtime?.player?.party) && runtime.player.party.filter(Boolean).length >= 6;
  state.board_events = state.board_events.map((event, index) => prepareSafariNormalEventV108(event, {
    day: Math.max(1, Math.trunc(Number(state.day) || 1)),
    index,
    partyFull,
  }));
  return runtime;
}

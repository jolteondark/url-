import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { canonicalBerryEntriesFromBagSlots } from "./mapless-v108-berry-catalog.js";

export const MAPLESS_V108_NORMAL_EVENT_WEIGHTS = Object.freeze({
  flooded_river: 6, burning_wagon: 6, mushroom_field: 6, hot_spring: 6,
  meteor_fragment: 2, honey_tree: 6, lost_pokemon: 6, sleeping_giant: 2,
  pokemon_nest: 6, berry_thief: 2, photographer: 6, traveling_cook: 6,
  street_performer: 6, lost_bag: 6, fake_nurse: 6, berry_juice_shop: 6,
  item_collector: 6, wishing_fountain: 2, old_statue: 2, auction: 1,
  trainer_camp: 6, berry_contest: 6, evolution_lab: 1, treasure_map_seller: 2,
  bounty_poster: 2, crumbling_bridge: 6, wounded_pokemon: 6, machine_gacha: 6,
  bloodline_grandmother: 6, retired_warrior: 6,
});

export const MAPLESS_V108_MACHINE_ITEM_IDS = Object.freeze(Array.from({ length: 100 }, (_, i) => `TM${String(i + 1).padStart(2, "0")}`));

const CANONICAL_TYPE_IDS = Object.freeze([
  "NORMAL", "FIRE", "WATER", "ELECTRIC", "GRASS", "ICE", "FIGHTING", "POISON", "GROUND",
  "FLYING", "PSYCHIC", "BUG", "ROCK", "GHOST", "DRAGON", "DARK", "STEEL", "FAIRY",
]);
const CANONICAL_BONUS_STATS = Object.freeze(["HP", "ATTACK", "DEFENSE", "SPECIAL_ATTACK", "SPECIAL_DEFENSE", "SPEED"]);
const CANONICAL_BAD_STATUSES = Object.freeze(["POISON", "PARALYSIS", "CONFUSION"]);
const CANONICAL_BOUNTY_APPEARANCES = Object.freeze([
  "赤い外套の大男", "傷だらけの女剣士", "仮面を着けた盗賊", "黒い帽子の放浪者", "長い銀髪の追跡者",
]);
const CANONICAL_CAMP_TASKS = Object.freeze(["cooking", "repair", "watch", "carry", "herbs"]);

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
function assignMissing(data, key, produce) {
  if (data[key] === undefined || data[key] === null) data[key] = produce();
}
function pick(rng, values) { return values[rng.randInt(values.length)]; }
function fixedStolenBerries(rng, bagSlots) {
  const berries = canonicalBerryEntriesFromBagSlots(bagSlots);
  if (berries.length === 0) return [];
  const count = 1 + rng.randInt(3);
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const choices = berries.filter(([id, qty]) => qty > result.filter((picked) => picked === id).length);
    if (choices.length === 0) break;
    result.push(choices[rng.randInt(choices.length)][0]);
  }
  return result;
}

// Canonical source-v0.9.108 MaplessNormalEvents.prepare_fixed_data fields.
// Item-backed Berry Thief data is hydrated from the existing runtime Bag plus the
// generated v0.9.108 berry reference; this module never mutates Bag state.
export function prepareCanonicalClassicNormalDataV108(id, normalData, { normalSeed, day, bagSlots = [] }) {
  const data = { ...(normalData ?? {}) };
  const rng = new RubyMT19937Random(Number(normalSeed) & 0x7fffffff);
  switch (id) {
    case "mushroom_field":
      assignMissing(data, "eat_roll", () => rng.randInt(100));
      assignMissing(data, "eat_stat", () => pick(rng, CANONICAL_BONUS_STATS));
      assignMissing(data, "bad_status", () => pick(rng, CANONICAL_BAD_STATUSES));
      break;
    case "burning_wagon": assignMissing(data, "manual_roll", () => rng.randInt(100)); break;
    case "meteor_fragment": assignMissing(data, "smash_roll", () => rng.randInt(100)); break;
    case "honey_tree":
      assignMissing(data, "shake_roll", () => rng.randInt(100));
      assignMissing(data, "bark_roll", () => rng.randInt(100));
      break;
    case "lost_pokemon":
      assignMissing(data, "join_roll", () => rng.randInt(100));
      assignMissing(data, "search_roll", () => rng.randInt(100));
      assignMissing(data, "type", () => pick(rng, CANONICAL_TYPE_IDS));
      break;
    case "sleeping_giant":
      assignMissing(data, "steal_roll", () => rng.randInt(100));
      assignMissing(data, "type", () => pick(rng, CANONICAL_TYPE_IDS));
      assignMissing(data, "boost_stat", () => rng.randInt(2) === 0 ? "ATTACK" : "SPECIAL_ATTACK");
      break;
    case "pokemon_nest":
      assignMissing(data, "search_roll", () => rng.randInt(100));
      assignMissing(data, "type", () => pick(rng, CANONICAL_TYPE_IDS));
      break;
    case "berry_thief":
      assignMissing(data, "thief_roll", () => rng.randInt(100));
      assignMissing(data, "stolen", () => fixedStolenBerries(rng, bagSlots));
      assignMissing(data, "type", () => pick(rng, ["NORMAL", "DARK", "GRASS"]));
      break;
    case "photographer": assignMissing(data, "requested_type", () => pick(rng, CANONICAL_TYPE_IDS)); break;
    case "traveling_cook": assignMissing(data, "prototype_roll", () => rng.randInt(100)); break;
    case "street_performer": assignMissing(data, "fraud_roll", () => rng.randInt(100)); break;
    case "lost_bag":
      assignMissing(data, "trap", () => rng.randInt(100) >= 65);
      assignMissing(data, "wait_roll", () => rng.randInt(100));
      break;
    case "fake_nurse":
      assignMissing(data, "fake", () => rng.randInt(100) >= 65);
      assignMissing(data, "id_roll", () => rng.randInt(100));
      break;
    case "wishing_fountain":
      assignMissing(data, "small_roll", () => rng.randInt(100));
      assignMissing(data, "large_roll", () => rng.randInt(100));
      assignMissing(data, "reach_roll", () => rng.randInt(100));
      assignMissing(data, "bonus_stat", () => pick(rng, CANONICAL_BONUS_STATS));
      break;
    case "old_statue":
      assignMissing(data, "pray_roll", () => rng.randInt(100));
      assignMissing(data, "offer_roll", () => rng.randInt(100));
      assignMissing(data, "break_roll", () => rng.randInt(100));
      break;
    case "trainer_camp":
      assignMissing(data, "task", () => pick(rng, CANONICAL_CAMP_TASKS));
      assignMissing(data, "manual_fail", () => rng.randInt(100) < 20);
      break;
    case "berry_contest":
      assignMissing(data, "rating_roll", () => rng.randInt(21) - 10);
      assignMissing(data, "bulk_roll", () => rng.randInt(100));
      break;
    case "treasure_map_seller": assignMissing(data, "fake", () => rng.randInt(100) >= 75); break;
    case "bounty_poster":
      assignMissing(data, "trainer_seed", () => rng.randInt(0x7fffffff));
      assignMissing(data, "type", () => pick(rng, CANONICAL_TYPE_IDS));
      assignMissing(data, "appearance", () => pick(rng, CANONICAL_BOUNTY_APPEARANCES));
      assignMissing(data, "reward", () => 1800 + Number(day || 0) * 250);
      break;
    case "crumbling_bridge":
      assignMissing(data, "careful_roll", () => rng.randInt(100));
      assignMissing(data, "reward_kind", () => rng.randInt(2) === 0 ? "treasure" : "rescue");
      break;
    default: break;
  }
  return data;
}

export function prepareSafariNormalEventV108(event, { day, index, partyFull = false, bagSlots = [] } = {}) {
  if (!event || event.kind !== "normal_event") return event;
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new RangeError("index must be 0..7");

  const normalSeed = Number.isInteger(event.normal_seed) ? (event.normal_seed & 0x7fffffff) : (seedFor(day, index) & 0x7fffffff);
  const weights = { ...MAPLESS_V108_NORMAL_EVENT_WEIGHTS };
  if (partyFull) delete weights.wounded_pokemon;
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const selectionSeed = nextSeed(normalSeed);
  const normalEventId = event.normal_event_id && weights[event.normal_event_id]
    ? event.normal_event_id
    : weightedEvent(weights, selectionSeed % total);
  const normalData = prepareCanonicalClassicNormalDataV108(normalEventId, event.normal_data, { normalSeed, day, bagSlots });

  if (normalEventId === "machine_gacha") {
    normalData.machine_stock ??= shuffledMachineStock(selectionSeed);
    normalData.machine_index = Number.isInteger(normalData.machine_index) ? normalData.machine_index : 0;
  }
  if (normalEventId === "bloodline_grandmother" || normalEventId === "retired_warrior") {
    normalData.teacher_seed ??= nextSeed(selectionSeed) & 0x7fffffff;
  }
  return {
    ...event,
    normal_event_id: normalEventId,
    normal_seed: normalSeed,
    normal_resolved: Boolean(event.normal_resolved),
    normal_data: normalData,
  };
}

export function hydrateSafariNormalEventCells(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || !Array.isArray(state.board_events)) return runtime;
  const partyFull = Array.isArray(runtime?.player?.party) && runtime.player.party.filter(Boolean).length >= 6;
  const bagSlots = runtime?.bag?.slots ?? [];
  state.board_events = state.board_events.map((event, index) => prepareSafariNormalEventV108(event, {
    day: Math.max(1, Math.trunc(Number(state.day) || 1)), index, partyFull, bagSlots,
  }));
  return runtime;
}

import { assembleDayBoard } from "./mapless-day-board-generation.js";
import { projectDayBoardEventName } from "./mapless-day-board-event-name-projection.js";
import { clearStoredRun, hasStoredRun, persistRunState, restoreRunState } from "./browser-run-storage.js";
import { ensureMaplessRunLifecycleState } from "./mapless-run-end-lifecycle.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { hydrateSafariNormalEventCells } from "./mapless-normal-event-v108-preparation.js";
import { prepareMaplessV108TreasureChest } from "./mapless-v108-treasure-chest.js";
import { SAFARI_BOUNTY_PROJECTION } from "./safari-playable-data.js";

export const SAFARI_PLAYABLE_SAVE_KEY = "mapless.safari.playable.v4";
export const SAFARI_PLAYABLE_VALUE_IDS = Object.freeze(["player", "variables", "bag", "storage_system"]);
export const SAFARI_PLAYABLE_STARTING_MONEY = 1000;

const ZERO_STATS = Object.freeze({ HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });
const FALSE_STATS = Object.freeze({ HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false });
const GENERAL_TYPES = Object.freeze([
  "BUG", "DARK", "DRAGON", "ELECTRIC", "FAIRY", "FIGHTING", "FIRE", "FLYING", "GHOST",
  "GRASS", "GROUND", "ICE", "NORMAL", "POISON", "PSYCHIC", "ROCK", "STEEL", "WATER",
]);
const TYPE_NAMES = Object.freeze({
  BUG: "むし", DARK: "あく", DRAGON: "ドラゴン", ELECTRIC: "でんき", FAIRY: "フェアリー",
  FIGHTING: "かくとう", FIRE: "ほのお", FLYING: "ひこう", GHOST: "ゴースト", GRASS: "くさ",
  GROUND: "じめん", ICE: "こおり", NORMAL: "ノーマル", POISON: "どく", PSYCHIC: "エスパー",
  ROCK: "いわ", STEEL: "はがね", WATER: "みず",
});

// Exact snapshot of safari-playable-integration-base#createStarter after
// resolvePokemonRuntimeMasters for source-v0.9.108. Keeping this immutable
// bootstrap snapshot avoids loading the full Pokemon runtime just to paint the
// first Day Board; the full owner still materializes newly created Pokemon.
const STARTER = Object.freeze({
  species: "EEVEE",
  level: 9,
  personal_id: 1,
  gender: 0,
  form: 0,
  moves: Object.freeze([Object.freeze({ id: "TACKLE", ppup: 0, pp: 35 })]),
  exp: 990,
  hp: 28,
  status: "NONE",
  status_count: 0,
  item: null,
  ability_id: "RUNAWAY",
  nature_id: "HARDY",
  evo_move_count: Object.freeze({}),
  evo_crest_count: Object.freeze({}),
  evo_recoil_count: 0,
  evo_step_count: 0,
  iv: ZERO_STATS,
  iv_maxed: FALSE_STATS,
  ev: ZERO_STATS,
  max_hp: 28,
  stats: Object.freeze({ ATTACK: 14, DEFENSE: 14, SPECIAL_ATTACK: 13, SPECIAL_DEFENSE: 16, SPEED: 14 }),
  mapless_bonus_stats: ZERO_STATS,
});

function clone(value) { return structuredClone(value); }
function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function createVillageState() {
  return {
    actions_left: 3,
    action_limit: 3,
    bounties: [clone(SAFARI_BOUNTY_PROJECTION)],
    active_bounty: null,
    bounty_board_locked: false,
  };
}
function ensureVillageState(state) {
  const defaults = createVillageState();
  const village = state.village && typeof state.village === "object" && !Array.isArray(state.village) ? state.village : {};
  state.village = {
    ...defaults,
    ...village,
    bounties: Array.isArray(village.bounties) ? village.bounties : defaults.bounties,
    active_bounty: village.active_bounty ?? null,
  };
}
function materializeBoardEvents(boardKinds, day) {
  return boardKinds.map((kind, index) => {
    if (kind === "wild") return { kind, type: "ELECTRIC", slot: index };
    if (kind === "trainer") {
      return {
        kind,
        trainer_full_name: "たんぱんこぞう",
        species_id: "RATTATA",
        species_name: "コラッタ",
        level: Math.max(5, Math.min(8, Number(day) + 4)),
        slot: index,
      };
    }
    return { kind, slot: index };
  });
}
function createBoardState(day) {
  const board = assembleDayBoard({ day });
  return {
    board_events: materializeBoardEvents(board.board_kinds, day),
    board_revealed: board.board_revealed,
    board_consumed: board.board_consumed,
    board_visited: Array(8).fill(false),
  };
}
function wildTypeFor(day, ordinal) {
  return GENERAL_TYPES[((Math.max(1, Number(day)) - 1) * 2 + ordinal) % GENERAL_TYPES.length];
}
function assignFullWildTypes(state) {
  let ordinal = 0;
  state.board_events = (state.board_events ?? []).map((event) => event?.kind === "wild"
    ? { ...event, type: wildTypeFor(state.day, ordinal++) }
    : event);
}
function randomUint32() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const out = new Uint32Array(1);
    globalThis.crypto.getRandomValues(out);
    return out[0] >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}
function randomBelow(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  while (true) {
    const value = randomUint32();
    if (value < limit) return value % max;
  }
}
function ensureTrainerSeeds(state) {
  const used = new Set();
  for (const event of state.board_events ?? []) {
    if (event?.kind === "trainer" && Number.isInteger(event.trainer_seed) && event.trainer_seed >= 0) used.add(event.trainer_seed);
  }
  state.board_events = (state.board_events ?? []).map((event, index) => {
    if (event?.kind !== "trainer" || (Number.isInteger(event.trainer_seed) && event.trainer_seed >= 0)) return event;
    const day = Math.max(1, Math.trunc(Number(state.day)));
    let seed = ((Math.imul(day, 1_000_003) ^ Math.imul(index + 1, 97_409) ^ randomBelow(0x7fffffff)) & 0x7fffffff) >>> 0;
    while (used.has(seed)) seed = (seed + 1) & 0x7fffffff;
    used.add(seed);
    return { ...event, trainer_seed: seed };
  });
}
function hydrateSafariTreasureChestCells(runtime) {
  const state = stateOf(runtime);
  if (!Array.isArray(state.board_events)) return runtime;
  const day = Math.max(1, Math.trunc(Number(state.day) || 1));
  state.board_events = state.board_events.map((event) => event?.kind === "treasure"
    ? prepareMaplessV108TreasureChest(event, {
      day,
      randomInt:(limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    })
    : event);
  return runtime;
}
function normalizeStartupRuntime(runtime) {
  const state = stateOf(runtime);
  if (!("shop" in state)) state.shop = null;
  if (!("location" in state)) state.location = "day_board";
  state.schema_version = 2;
  ensureMaplessRunLifecycleState(runtime);
  runtime.bag ??= { slots: [], money: 0 };
  runtime.bag.money = Number(runtime.bag.money ?? 0);
  runtime.storage_system ??= { boxes: [{ name: "Box 1", capacity: 30, slots: [] }], currentBox: 0 };

  // A closed run must stay cold until the player explicitly chooses the next
  // carryover from home. Do not regenerate village/Board/encounter state on Continue.
  if (state.mapless_carryover_pending || state.location === "home") {
    state.location = "home";
    state.shop = null;
    globalThis.__maplessSafariRuntime = runtime;
    return runtime;
  }

  ensureVillageState(state);
  ensureSafariEncounterSeed(state);
  hydrateSafariTreasureChestCells(runtime);
  assignFullWildTypes(state);
  ensureTrainerSeeds(state);
  hydrateSafariNormalEventCells(runtime);
  globalThis.__maplessSafariRuntime = runtime;
  return runtime;
}
function persistenceOptions() {
  return { key: SAFARI_PLAYABLE_SAVE_KEY, valueIds: SAFARI_PLAYABLE_VALUE_IDS };
}

export function createSafariPlayableRuntime() {
  const board = createBoardState(1);
  return normalizeStartupRuntime({
    player: { party: [clone(STARTER)] },
    variables: {
      mapless: {
        schema_version: 2,
        day: 1,
        ...board,
        notice: "Day Boardからマスを選んでください。",
        location: "day_board",
        battle: null,
        shop: null,
        village: createVillageState(),
        last_operations: [],
      },
    },
    bag: { slots: [], money: SAFARI_PLAYABLE_STARTING_MONEY },
    storage_system: { boxes: [{ name: "Box 1", capacity: 30, slots: [] }], currentBox: 0 },
  });
}

export function boardCellPresentation(runtime, index) {
  const state = stateOf(runtime);
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new RangeError("board index must be 0..7");
  if (state.location === "home" || state.mapless_carryover_pending) {
    return {
      index,
      kind: "run_end",
      label: index === 0 ? "ラン終了" : "—",
      revealed: true,
      consumed: true,
      disabled: true,
    };
  }
  if (index >= state.board_events.length) throw new RangeError("board index must be 0..7");
  const event = state.board_events[index];
  const revealed = Boolean(state.board_revealed[index]);
  let label = "？？？";
  if (revealed) {
    if (event.kind === "trainer") label = "トレーナー戦";
    else label = projectDayBoardEventName(event, TYPE_NAMES);
  }
  return {
    index,
    kind: event.kind,
    label,
    revealed,
    consumed: Boolean(state.board_consumed[index]),
    disabled: Boolean(state.board_consumed[index] && !["shop", "egg_shop"].includes(event.kind)),
  };
}
export function hasSafariPlayableRun(storage) {
  return hasStoredRun(storage, SAFARI_PLAYABLE_SAVE_KEY);
}
export function saveSafariPlayableRun(storage, runtime) {
  stateOf(runtime);
  return persistRunState(storage, runtime, persistenceOptions());
}
export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = restoreRunState(storage, currentRuntime, persistenceOptions());
  if (loaded.found) loaded.state = normalizeStartupRuntime(loaded.state);
  return loaded;
}
export function clearSafariPlayableRun(storage) {
  return clearStoredRun(storage, SAFARI_PLAYABLE_SAVE_KEY);
}

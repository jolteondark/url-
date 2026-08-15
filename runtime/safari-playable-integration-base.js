import { assembleDayBoard } from "./mapless-day-board-generation.js";
import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { resolveDayBoardPlayableTurn } from "./mapless-day-board-playable-turn.js";
import { projectDayBoardEventName } from "./mapless-day-board-event-name-projection.js";
import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBrowserMaplessWildEncounter } from "./browser-mapless-wild-encounter-runtime.js";
import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import { resolveCaptureFlow } from "./battle-capture-flow.js";
import { routeCaughtQueueToPartyStorage } from "./caught-queue-party-storage.js";
import { resolveItemReceipt } from "./bag-economy-item-receipt.js";
import { quantity } from "./bag-economy-mart-flow.js";
import { clearStoredRun, hasStoredRun, persistRunState, restoreRunState } from "./browser-run-storage.js";
import { resolveVillageShopEconomySlice } from "./mapless-village-shop-economy-slice.js";
import { buildBountyBattlePrelaunch } from "./mapless-bounty-battle-prelaunch.js";
import { resolveVillageBountyAccept } from "./mapless-village-bounty-lifecycle.js";
import { resolveVillageBountyMoneyIntegration } from "./mapless-village-bounty-money-integration.js";
import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import {
  SAFARI_MOVE_LABELS,
  SAFARI_MOVE_MASTERS,
  SAFARI_NATURE_MASTERS,
  SAFARI_BOUNTY_PROJECTION,
  SAFARI_NORMAL_SHOP_STOCK,
  SAFARI_SHOP_ITEM_MASTERS,
  SAFARI_SPECIES_MASTERS,
  SAFARI_WILD_ENCOUNTER_PROJECTIONS,
  SAFARI_ZERO_STAT_VALUES,
} from "./safari-playable-data.js";

export const SAFARI_PLAYABLE_SAVE_KEY = "mapless.safari.playable.v4";
export const SAFARI_PLAYABLE_VALUE_IDS = Object.freeze(["player", "variables", "bag", "storage_system"]);
// Browser-run seed used to exercise the existing shop domain; transaction
// rules and all subsequent Money changes remain owned by Bag/Economy.
export const SAFARI_PLAYABLE_STARTING_MONEY = 1000;

const PRE_SHUFFLE_KINDS = Object.freeze(["center", "shop", "egg_shop", "wild", "wild", "trainer", "trainer"]);
const GENERATION_DECISIONS = Object.freeze([
  { shuffle_order: [3, 0, 5, 1, 4, 2, 6], next_day_index: 7 },
  { shuffle_order: [6, 4, 1, 3, 0, 5, 2], next_day_index: 2 },
  { shuffle_order: [2, 5, 3, 0, 6, 4, 1], next_day_index: 5 },
  { shuffle_order: [4, 1, 6, 2, 5, 0, 3], next_day_index: 0 },
]);

export const SAFARI_MOVE_PRESENTATION = Object.freeze(Object.fromEntries(
  Object.entries(SAFARI_MOVE_MASTERS).map(([id, master]) => [id, Object.freeze({
    name: SAFARI_MOVE_LABELS[id] ?? master.name,
    power: master.power,
    accuracy: master.accuracy,
    priority: master.priority,
    totalPp: master.total_pp,
  })]),
));

const TYPE_NAMES = Object.freeze({ ELECTRIC: "でんき" });

function createVillageState() {
  return {
    actions_left: 3,
    action_limit: 3,
    bounties: [structuredClone(SAFARI_BOUNTY_PROJECTION)],
    active_bounty: null,
    bounty_board_locked: false,
  };
}

function ensureVillageState(state) {
  const defaults = createVillageState();
  const village = state.village && typeof state.village === "object" && !Array.isArray(state.village)
    ? state.village
    : {};
  state.village = {
    ...defaults,
    ...village,
    bounties: Array.isArray(village.bounties) ? village.bounties : defaults.bounties,
    active_bounty: village.active_bounty ?? null,
  };
  return state.village;
}

function ablePokemonCount(runtime) {
  return runtime.player.party.filter((pokemon) => Number(pokemon?.hp ?? 0) > 0).length;
}

function requestsSave(operations = []) {
  return operations.some((operation) => operation.op === "request_save");
}

function generationForDay(day) {
  const decisions = GENERATION_DECISIONS[(Math.max(Number(day), 1) - 1) % GENERATION_DECISIONS.length];
  return {
    pre_shuffle_kinds: [...PRE_SHUFFLE_KINDS],
    shuffle_order: [...decisions.shuffle_order],
    next_day_index: decisions.next_day_index,
  };
}

function normalizeSafariMoveId(id) {
  return id === "QUICK_ATTACK" ? "QUICKATTACK" : id;
}

function materializeSafariPokemon(input) {
  const speciesMaster = SAFARI_SPECIES_MASTERS[input?.species];
  if (!speciesMaster) throw new RangeError(`species is outside the Safari projection: ${input?.species}`);
  const moves = (input.moves ?? []).map((move) => {
    const id = normalizeSafariMoveId(moveId(move));
    if (!SAFARI_MOVE_MASTERS[id]) throw new RangeError(`move is outside the Safari projection: ${id}`);
    return typeof move === "string" ? id : { ...move, id };
  });
  const natureId = input.nature_for_stats_id ?? input.nature_id ?? "HARDY";
  return resolvePokemonRuntimeMasters({
    ...input,
    hp: input.hp ?? 1,
    nature_id: input.nature_id ?? natureId,
    iv: input.iv ?? { ...SAFARI_ZERO_STAT_VALUES },
    ev: input.ev ?? { ...SAFARI_ZERO_STAT_VALUES },
    moves,
  }, {
    species_master: speciesMaster,
    nature_master: SAFARI_NATURE_MASTERS[natureId],
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

function createStarter() {
  return materializeSafariPokemon({
    species: "EEVEE",
    level: 9,
    exp: 990,
    personal_id: 1,
    gender: 0,
    status: "NONE",
    ability_id: "RUNAWAY",
    nature_id: "HARDY",
    moves: ["TACKLE"],
  });
}

function createTrainerOpponent(day) {
  return materializeSafariPokemon({
    species: "RATTATA",
    level: Math.max(5, Math.min(8, Number(day) + 4)),
    hp: 1,
    nature_id: "HARDY",
    iv: { ...SAFARI_ZERO_STAT_VALUES },
    ev: { ...SAFARI_ZERO_STAT_VALUES },
    status: "NONE",
    moves: ["TACKLE"],
  });
}

function projectSafariGeneratedWildEncounter(day, type) {
  const projection = SAFARI_WILD_ENCOUNTER_PROJECTIONS[type];
  if (!projection) throw new RangeError(`wild type is outside the Safari projection: ${type}`);
  const projectedDay = Math.max(Number.isFinite(Number(day)) ? Math.trunc(Number(day)) : 1, 1);
  return {
    required_type: projection.required_type,
    species_id: projection.species_id,
    species_name: projection.species_name,
    base_level: Math.max(
      projection.min_projected_base_level,
      Math.min(projection.max_projected_base_level, projectedDay + projection.base_level_day_offset),
    ),
    move_ids: [...projection.move_ids],
    variance: projection.variance,
    min_level: projection.min_level,
    max_level: projection.max_level,
  };
}

function materializeBoardEvents(boardKinds, day) {
  return boardKinds.map((kind, index) => {
    if (kind === "wild") {
      return {
        kind,
        type: "ELECTRIC",
        slot: index,
      };
    }
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
  const generation = generationForDay(day);
  const board = assembleDayBoard({ day, ...generation });
  return {
    board_events: materializeBoardEvents(board.board_kinds, day),
    board_revealed: board.board_revealed,
    board_consumed: board.board_consumed,
    board_visited: Array(8).fill(false),
  };
}

function maplessState(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function applyResolvedBoardState(state, resolved) {
  state.board_events = resolved.board_events;
  state.board_revealed = resolved.board_revealed;
  state.board_consumed = resolved.board_consumed;
}

function baseTurnInput(state, index) {
  return {
    index,
    day: state.day,
    board_events: state.board_events,
    board_revealed: state.board_revealed,
    board_consumed: state.board_consumed,
    board_visited: state.board_visited,
    notice: state.notice,
    scene_is_self: true,
    scene_same: true,
    event_stage_active: true,
    pending_hatches: [],
  };
}

function battlePresentation(operations) {
  const events = [];
  for (const operation of operations) {
    if (operation.op === "use_move") {
      events.push({ type: "move_selected", actor: operation.actor, moveId: operation.moveId });
      events.push({ type: "move_started", actor: operation.actor, target: operation.target, moveId: operation.moveId });
    } else if (operation.op === "accuracy_check" && !operation.hit) {
      events.push({ type: "miss", actor: operation.actor, target: operation.target });
    } else if (operation.op === "reduce_hp") {
      events.push({
        type: "damage_applied",
        actor: operation.actor,
        target: operation.target,
        amount: operation.amount,
        hpBefore: operation.hpBefore,
        hpAfter: operation.hpAfter,
      });
    } else if (operation.op === "faint") {
      events.push({ type: "faint", target: operation.target });
    } else if (operation.op === "end_of_round" || operation.op === "end_of_round_phase") {
      events.push({ type: "turn_end", turn: operation.battleTurn ?? operation.turn ?? operation.round });
    }
  }
  return events;
}

export function createSafariPlayableRuntime() {
  const board = createBoardState(1);
  return {
    player: { party: [createStarter()] },
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
    storage_system: {
      boxes: [{ name: "Box 1", capacity: 30, slots: [] }],
      currentBox: 0,
    },
  };
}

export function boardCellPresentation(runtime, index) {
  const state = maplessState(runtime);
  if (!Number.isInteger(index) || index < 0 || index >= state.board_events.length) {
    throw new RangeError("board index must be 0..7");
  }
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

function startBattle(runtime, event, index, dispatchOperations) {
  const state = maplessState(runtime);
  let opponent;
  let encounterResolution = null;
  const startOperations = [...dispatchOperations];
  if (event.kind === "wild") {
    const generated = projectSafariGeneratedWildEncounter(state.day, event.type);
    encounterResolution = resolveBrowserMaplessWildEncounter({
      day: state.day,
      event,
      boardIndex: index,
      generated,
      variance: generated.variance,
      minLevel: generated.min_level,
      maxLevel: generated.max_level,
      gameTempPresent: true,
    });
    const encounter = encounterResolution.encounter;
    opponent = materializeSafariPokemon({
      species: encounter.species_id,
      level: encounter.level,
      hp: 1,
      nature_id: "HARDY",
      iv: { ...SAFARI_ZERO_STAT_VALUES },
      ev: { ...SAFARI_ZERO_STAT_VALUES },
      status: "NONE",
      moves: encounter.move_ids,
    });
    startOperations.push(...encounterResolution.operations);
  } else {
    opponent = createTrainerOpponent(state.day);
  }
  const battleStart = resolveBattleStartCore({
    sendOuts: [[0, runtime.player.party[0]], [1, opponent]],
  });
  state.battle = {
    kind: event.kind,
    board_index: index,
    turn: 1,
    decision: 0,
    completed: false,
    captured: false,
    foe: opponent,
    encounter_request: encounterResolution?.request ?? null,
    encounter: encounterResolution?.encounter ?? null,
    encounter_cleanup: encounterResolution?.cleanup ?? [],
    last_operations: [...startOperations, ...battleStart.operations],
    presentation: [{
      type: "battle_started",
      actor: "foe",
      species: opponent.species,
      trainer: event.trainer_full_name ?? null,
    }],
  };
  state.notice = event.kind === "trainer"
    ? event.trainer_full_name + "が勝負を仕掛けてきた！"
    : "野生の" + encounterResolution.encounter.species_name + "が現れた！";
  state.last_operations = state.battle.last_operations;
}

function applyFacilityEffects(runtime, operations) {
  if (!operations.some((operation) => operation.op === "heal_party" && operation.result === true)) return;
  runtime.player.party = runtime.player.party.map((pokemon) => updatePokemonRuntime(
    pokemon,
    { hp: pokemon.max_hp ?? pokemon.hp ?? 1, status: "NONE", status_count: 0 },
  ));
}

export function activateSafariDayBoardCell(runtime, index) {
  const state = maplessState(runtime);
  if (state.battle && !state.battle.completed) {
    return { runtime, result: "battle_active", boundary: "battle", notice: "戦闘を先に終えてください。", operations: [] };
  }
  if (state.shop) {
    return { runtime, result: "shop_active", boundary: "shop", notice: "ショップを先に終了してください。", operations: [] };
  }
  const event = state.board_events[index];
  if (!event) throw new RangeError("board index must be 0..7");
  const reusable = ["shop", "egg_shop"].includes(event.kind);

  if (event.kind === "wild" || event.kind === "trainer") {
    const dispatch = resolveDayBoardCellDispatch({ ...baseTurnInput(state, index), reusable });
    applyResolvedBoardState(state, dispatch.state);
    state.last_operations = dispatch.operations;
    state.notice = dispatch.notice;
    if (dispatch.result === "dispatched") startBattle(runtime, event, index, dispatch.operations);
    return {
      runtime,
      result: dispatch.result,
      boundary: event.kind,
      notice: state.notice,
      operations: state.battle?.last_operations ?? dispatch.operations,
      presentation: state.battle?.presentation ?? [],
    };
  }

  const input = baseTurnInput(state, index);
  if (event.kind === "next_day") {
    input.next_day = { confirmed: true, generation: generationForDay(state.day + 1) };
  } else if (["center", "shop", "egg_shop"].includes(event.kind)) {
    input.facility = { healed: true };
  } else if (event.kind === "normal_event") {
    input.normal_event = {
      event_name: event.normal_event_id ?? "出来事",
      open_result: true,
      normal_resolved_after_open: true,
      event_resolution: event.resolution ?? null,
    };
  }

  const turn = resolveDayBoardPlayableTurn(input);
  applyResolvedBoardState(state, turn.state);
  state.last_operations = turn.operations;
  state.notice = turn.notice ?? state.notice;
  applyFacilityEffects(runtime, turn.operations.flatMap((entry) => entry.resolved?.operations ?? [entry]));
  if (turn.day_transition?.board_regenerated) {
    state.day = turn.day_transition.day;
    state.board_events = materializeBoardEvents(turn.day_transition.board_kinds, state.day);
    state.board_revealed = turn.day_transition.board_revealed;
    state.board_consumed = turn.day_transition.board_consumed;
    state.board_visited = Array(8).fill(false);
  }
  if (event.kind === "shop" && turn.result === "completed") {
    state.shop = {
      facility_id: "normal_shop",
      board_index: index,
      stock: [...SAFARI_NORMAL_SHOP_STOCK],
      last_transaction_result: null,
    };
    state.notice = "商品と数量を選び、購入を確定してください。";
    return {
      runtime,
      result: "shop_opened",
      turn_result: turn.result,
      boundary: turn.boundary,
      notice: state.notice,
      operations: turn.operations,
    };
  }
  return { runtime, result: turn.result, boundary: turn.boundary, notice: state.notice, operations: turn.operations };
}

export function safariShopPresentation(runtime) {
  const state = maplessState(runtime);
  const shop = state.shop;
  if (!shop) return null;
  return {
    facilityId: shop.facility_id,
    boardIndex: shop.board_index,
    money: Number(runtime.bag?.money ?? 0),
    lastTransactionResult: shop.last_transaction_result,
    items: shop.stock.map((itemId) => {
      const master = SAFARI_SHOP_ITEM_MASTERS[itemId];
      if (!master) throw new RangeError(`shop item is outside the Safari projection: ${itemId}`);
      return {
        ...master,
        quantity: quantity(runtime.bag?.slots ?? [], itemId),
      };
    }),
  };
}

function shopNotice(transactionResult, item, requestedQuantity) {
  if (transactionResult === "bought") return `${item.label}を${requestedQuantity}個購入しました。Day Boardへ戻りました。`;
  if (transactionResult === "not_enough_money") return "所持金が足りません。数量を減らしてください。";
  if (transactionResult === "no_room") return "バッグに空きがありません。";
  if (transactionResult === "cancelled") return "購入を取り消しました。";
  return `購入できませんでした（${transactionResult}）。`;
}

export function purchaseSafariShopItem(runtime, input = {}) {
  const state = maplessState(runtime);
  const shop = state.shop;
  if (!shop) throw new Error("active shop is required");
  const itemId = String(input.itemId ?? "");
  const item = SAFARI_SHOP_ITEM_MASTERS[itemId];
  if (!item || !shop.stock.includes(itemId)) throw new RangeError("selected item is outside the active shop stock");
  const confirmed = input.confirmed !== false;
  const requestedQuantity = confirmed ? Number(input.quantity) : 0;
  if (confirmed && (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0)) {
    throw new RangeError("shop quantity must be a positive integer");
  }
  const resolved = resolveVillageShopEconomySlice({
    facility_id: shop.facility_id,
    valid_stock: shop.stock,
    facility_used_up: false,
    action_available: true,
    machine_items: {},
    slots: runtime.bag.slots,
    money: runtime.bag.money,
    transaction: {
      kind: "buy",
      item: itemId,
      unitPrice: item.price,
      qty: requestedQuantity,
      maxSlots: 20,
      maxPerSlot: 99,
      maxMoney: 999999,
    },
    consume_action_success: true,
    save_available: true,
  });
  runtime.bag.slots = resolved.slots;
  runtime.bag.money = resolved.money;
  shop.last_transaction_result = resolved.transaction_result;
  state.last_operations = resolved.facility.operations;
  state.notice = shopNotice(resolved.transaction_result, item, requestedQuantity);
  if (resolved.result) state.shop = null;
  return {
    runtime,
    itemId,
    quantity: requestedQuantity,
    ...resolved,
    operations: resolved.facility.operations,
  };
}

export function leaveSafariShop(runtime) {
  const state = maplessState(runtime);
  if (!state.shop) throw new Error("active shop is required");
  state.shop = null;
  state.notice = "ショップを出てDay Boardへ戻りました。";
  state.last_operations = [{ op: "return_to_day_board", from: "shop" }];
  return { runtime, result: "returned", operations: state.last_operations };
}

export function enterSafariVillage(runtime) {
  const state = maplessState(runtime);
  if (state.battle) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  ensureVillageState(state);
  state.location = "village";
  state.notice = "村の手配掲示板です。依頼の確認または出発ができます。";
  state.last_operations = [{ op: "browser_navigate", target: "village" }];
  return { runtime, result: "entered", operations: state.last_operations };
}

export function leaveSafariVillage(runtime) {
  const state = maplessState(runtime);
  if (state.battle) throw new Error("active battle must be completed first");
  state.location = "day_board";
  state.notice = "村からDay Boardへ戻りました。";
  state.last_operations = [{ op: "browser_navigate", target: "day_board" }];
  return { runtime, result: "returned", operations: state.last_operations };
}

export function safariVillagePresentation(runtime) {
  const state = maplessState(runtime);
  const village = ensureVillageState(state);
  const quest = village.active_bounty ?? village.bounties[0] ?? null;
  return {
    active: state.location === "village",
    actionsLeft: Number(village.actions_left ?? 0),
    actionLimit: Number(village.action_limit ?? 3),
    boardLocked: Boolean(village.bounty_board_locked),
    hasActiveBounty: Boolean(village.active_bounty),
    ablePokemonCount: ablePokemonCount(runtime),
    quest: quest == null ? null : {
      species: quest.species,
      speciesName: quest.species_name ?? quest.species,
      prefix: quest.prefix ?? null,
      level: Number(quest.level ?? 0),
      reward: Number(quest.reward ?? 0),
    },
  };
}

export function acceptSafariVillageBounty(runtime, input = {}) {
  const state = maplessState(runtime);
  const village = ensureVillageState(state);
  const choice = Number(input.choice ?? 0);
  const selected = village.bounties[choice] ?? null;
  const resolved = resolveVillageBountyAccept({
    facility_id: "bounty_board",
    village,
    repaired_bounties: village.bounties,
    choice,
    species_name: selected?.species_name ?? selected?.species ?? null,
    accept_confirmed: input.confirmed === true,
  });
  state.village = resolved.state;
  state.last_operations = resolved.operations;
  state.notice = resolved.accepted
    ? `${selected.prefix ?? ""}${selected.species_name ?? selected.species}の討伐依頼を受けました。`
    : "討伐依頼は受注されませんでした。";
  return {
    runtime,
    ...resolved,
    persistenceRequested: requestsSave(resolved.operations),
  };
}

export function startSafariVillageBounty(runtime) {
  const state = maplessState(runtime);
  if (state.battle) throw new Error("battle is already active");
  if (state.shop) throw new Error("shop must be closed before bounty departure");
  const village = ensureVillageState(state);
  const quest = village.active_bounty;
  if (!quest) throw new Error("active bounty is required");
  const ableCount = ablePokemonCount(runtime);
  const preflight = resolveVillageBountyMoneyIntegration({
    village,
    able_pokemon_count: ableCount,
    confirmed: false,
    money: runtime.bag.money,
    maxMoney: 999999,
  });
  if (!preflight.depart.operations.some((operation) => operation.op === "confirm_bounty_depart")) {
    state.last_operations = preflight.depart.operations;
    state.notice = preflight.depart.operations.some((operation) => operation.key === "no_able_pokemon")
      ? "戦えるポケモンがいません。"
      : "村で使える行動が残っていません。";
    return { runtime, result: false, operations: state.last_operations };
  }
  const speciesName = quest.species_name ?? quest.species;
  const prelaunch = buildBountyBattlePrelaunch({
    species_name: speciesName,
    confirmed: true,
    quest,
    capabilities: {
      sound_feedback: true,
      form_setter: true,
      personal_id_setter: true,
      gender_setter: true,
    },
    battle_outcome: 0,
    carryover: { defined: true, run_end_pending: false },
  });
  const target = prelaunch.operations.find((operation) => operation.op === "construct_target")?.target;
  if (!target) throw new Error("bounty prelaunch did not construct a target");
  const opponent = materializeSafariPokemon({
    ...target,
    hp: 1,
    nature_id: "HARDY",
    iv: { ...SAFARI_ZERO_STAT_VALUES },
    ev: { ...SAFARI_ZERO_STAT_VALUES },
    status: "NONE",
    moves: quest.move_ids ?? ["TACKLE"],
  });
  const battleStart = resolveBattleStartCore({
    sendOuts: [[0, runtime.player.party[0]], [1, opponent]],
  });
  const startOperations = [
    ...preflight.depart.operations,
    ...prelaunch.operations,
    ...battleStart.operations,
  ];
  state.battle = {
    kind: "wild",
    origin: "village_bounty",
    return_target: preflight.return_target,
    board_index: null,
    turn: 1,
    decision: 0,
    completed: false,
    captured: false,
    foe: opponent,
    encounter: {
      species_id: opponent.species,
      species_name: speciesName,
      level: opponent.level,
    },
    bounty_snapshot: structuredClone(quest),
    able_pokemon_count: ableCount,
    last_operations: startOperations,
    presentation: [{
      type: "battle_started",
      actor: "foe",
      species: opponent.species,
      bounty: true,
    }],
  };
  state.notice = `${speciesName}の討伐へ出発しました。`;
  state.last_operations = startOperations;
  return {
    runtime,
    result: "battle_started",
    operations: startOperations,
    presentation: state.battle.presentation,
    preflight,
    prelaunch,
  };
}

function awardWin(runtime, battle, { includeItemReward = true } = {}) {
  const player = runtime.player.party[0];
  const foeMaster = SAFARI_SPECIES_MASTERS[battle.foe.species];
  const expFlow = resolveExpLevelMoveFlow({
    pokemon: {
      exp: player.exp ?? 0,
      level: player.level,
      moves: player.moves.map(moveId),
    },
    maximumExp: 1_000_000,
    maxMoves: 4,
    expContext: {
      defeatedLevel: battle.foe.level,
      baseExp: foeMaster.base_exp,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: true,
      moreExpFromTrainerPokemon: battle.kind === "trainer",
      trainerBattle: battle.kind === "trainer",
      scaledExpFormula: false,
      outsiderMultiplier: 1,
    },
    levelThresholds: { 6: 216, 7: 343, 8: 512, 9: 729, 10: 1000 },
    movesByLevel: { 10: ["QUICKATTACK"] },
    moveDecisions: {},
  });
  const currentMoves = new Map(player.moves.map((move) => [moveId(move), move]));
  const resolvedMoves = expFlow.pokemon.moves.map((id) => {
    const canonicalId = normalizeSafariMoveId(id);
    return currentMoves.has(canonicalId)
      ? structuredClone(currentMoves.get(canonicalId))
      : canonicalId;
  });
  runtime.player.party[0] = materializeSafariPokemon({
    ...player,
    exp: expFlow.pokemon.exp,
    level: expFlow.pokemon.level,
    moves: resolvedMoves,
  });
  battle.exp_gained = expFlow.expGained;
  const expOperations = expFlow.operations.map((operation) => ({ ...operation, scope: "exp" }));
  if (!includeItemReward) return expOperations;
  const receipt = resolveItemReceipt({
    slots: runtime.bag.slots,
    maxSlots: 20,
    maxPerSlot: 99,
    item: "POTION",
    quantity: 1,
    itemValid: true,
    kind: "prize",
    pocket: "MEDICINE",
  });
  runtime.bag.slots = receipt.slots;
  battle.reward = receipt.success ? { item: "POTION", quantity: 1 } : null;
  return [
    ...expOperations,
    ...receipt.operations.map((operation) => ({ ...operation, scope: "reward" })),
  ];
}

function finalizeBountyBattle(runtime) {
  const state = maplessState(runtime);
  const battle = state.battle;
  const completionOperations = [];
  if (battle.decision === 1) {
    completionOperations.push(...awardWin(runtime, battle, { includeItemReward: false }));
  }
  const resolved = resolveVillageBountyMoneyIntegration({
    village: ensureVillageState(state),
    able_pokemon_count: battle.able_pokemon_count,
    confirmed: true,
    consume_action_success: true,
    outcome: battle.decision,
    money_gained: battle.bounty_snapshot?.reward ?? 0,
    money: runtime.bag.money,
    maxMoney: 999999,
    action_limit: state.village.action_limit ?? 3,
  });
  state.village = resolved.state;
  runtime.bag.money = resolved.money;
  completionOperations.push(...resolved.depart.operations, ...resolved.moneyOperations);
  battle.money_gained = resolved.moneyDelta;
  battle.reward = resolved.moneyDelta > 0 ? { money: resolved.moneyDelta } : null;
  battle.return_target = resolved.return_target;
  battle.completed = true;
  battle.last_operations = [...battle.last_operations, ...completionOperations];
  battle.presentation = [
    ...battle.presentation,
    {
      type: "battle_result",
      decision: battle.decision,
      captured: battle.captured,
      expGained: battle.exp_gained ?? 0,
      reward: battle.reward,
      moneyGained: battle.money_gained,
      returnTarget: battle.return_target,
    },
  ];
  state.last_operations = completionOperations;
  const speciesName = battle.encounter?.species_name ?? battle.foe.species;
  state.notice = battle.captured
    ? `${speciesName}を捕獲し、賞金${resolved.moneyDelta}円を受け取りました。`
    : battle.decision === 1
      ? `${speciesName}を討伐し、賞金${resolved.moneyDelta}円を受け取りました。`
      : "討伐は終了しました。村へ戻ります。";
}

function finalizeBattle(runtime) {
  const state = maplessState(runtime);
  const battle = state.battle;
  if (battle.origin === "village_bounty") {
    finalizeBountyBattle(runtime);
    return;
  }
  const event = state.board_events[battle.board_index];
  const input = baseTurnInput(state, battle.board_index);
  if (battle.kind === "wild") {
    const encounter = battle.encounter ?? {
      species_id: event.species_id,
      species_name: event.species_name,
      level: event.level,
    };
    input.wild = {
      can_battle: true,
      encounter: { species_id: encounter.species_id, level: encounter.level },
      species_exists: true,
      species_name: encounter.species_name,
      outcome: battle.decision,
      run_end_pending: false,
      old_consumed: false,
      game_temp_present: true,
    };
  } else {
    input.trainer = {
      can_battle: true,
      dynamic_result: {
        outcome: battle.decision,
        trainer_full_name: event.trainer_full_name,
      },
      last_error: null,
    };
  }
  const turn = resolveDayBoardPlayableTurn(input);
  applyResolvedBoardState(state, turn.state);
  const completionOperations = [...turn.operations];
  if (battle.decision === 1) completionOperations.push(...awardWin(runtime, battle));
  battle.completed = true;
  battle.last_operations = [...battle.last_operations, ...completionOperations];
  battle.presentation = [
    ...battle.presentation,
    {
      type: "battle_result",
      decision: battle.decision,
      captured: battle.captured,
      expGained: battle.exp_gained ?? 0,
      reward: battle.reward ?? null,
      moneyGained: 0,
      returnTarget: "day_board",
    },
  ];
  state.last_operations = completionOperations;
  const wildSpeciesName = battle.encounter?.species_name ?? event.species_name;
  state.notice = battle.captured
    ? wildSpeciesName + "を捕まえました。"
    : battle.decision === 1
      ? (battle.kind === "trainer" ? event.trainer_full_name : wildSpeciesName) + "に勝利しました。"
      : "戦闘に敗北しました。";
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const state = maplessState(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  const player = runtime.player.party[0];
  const canonicalMoveId = normalizeSafariMoveId(selectedMoveId);
  if (!player || !player.moves.some((move) => moveId(move) === canonicalMoveId)) {
    throw new RangeError("selected move is not known by the active Pokemon");
  }
  if (!SAFARI_MOVE_PRESENTATION[canonicalMoveId]) {
    throw new RangeError("selected move is outside the Safari projection");
  }
  const foeMoveId = moveId(battle.foe.moves[0]);
  const resolved = resolveBrowserBattleRound({
    player,
    foe: battle.foe,
    selectedMoveId: canonicalMoveId,
    foeMoveId,
    moveMasters: SAFARI_MOVE_MASTERS,
    playerRandomRoll: 0,
    foeRandomRoll: 0,
  });
  const operations = resolved.operations.map((operation) => ({
    ...operation,
    battleTurn: battle.turn,
  }));
  runtime.player.party[0] = resolved.player;
  battle.foe = resolved.foe;
  battle.decision = resolved.decision;
  battle.turn += 1;
  battle.last_operations = operations;
  battle.presentation = battlePresentation(operations);
  state.last_operations = operations;
  if (battle.decision > 0) finalizeBattle(runtime);
  const resultOperations = battle.decision > 0 ? battle.last_operations : operations;
  return {
    runtime,
    decision: battle.decision,
    operations: resultOperations,
    presentation: battle.presentation,
    scheduling: resolved.scheduling,
    ppIntegration: resolved.ppIntegration,
    battleRuntimeIntegration: resolved.battleRuntimeIntegration,
    persistenceRequested: requestsSave(resultOperations),
  };
}

export function attemptSafariCapture(runtime) {
  const state = maplessState(runtime);
  const battle = state.battle;
  if (!battle || battle.completed || battle.kind !== "wild") throw new Error("active wild battle is required");
  const capture = resolveCaptureFlow({
    targetFainted: battle.foe.hp <= 0,
    trainerBattle: false,
    ball: "POKEBALL",
    decision: 4,
    gainExpForCapture: false,
    allFaintedAfterCapture: false,
    capture: {
      totalHp: battle.foe.max_hp,
      hp: Math.max(1, battle.foe.hp),
      catchRate: SAFARI_SPECIES_MASTERS[battle.foe.species].catch_rate,
      status: battle.foe.status ?? "NONE",
      ball: "POKEBALL",
      unconditional: false,
      enableCriticalCaptures: false,
      randomValues: [0, 0, 0, 0],
    },
  });
  if (capture.result !== "caught") {
    state.notice = "捕獲結果: " + capture.result;
    return {
      runtime,
      result: capture.result,
      operations: capture.operations,
      presentation: [],
      calculation: capture.capture,
    };
  }
  const routed = routeCaughtQueueToPartyStorage({
    party: runtime.player.party,
    boxes: runtime.storage_system.boxes,
    currentBox: runtime.storage_system.currentBox,
  }, [battle.foe]);
  runtime.player.party = routed.state.party;
  runtime.storage_system.boxes = routed.state.boxes;
  runtime.storage_system.currentBox = routed.state.currentBox;
  battle.captured = true;
  battle.capture_destination = routed.routed[0]?.result ?? "full";
  battle.decision = 4;
  battle.last_operations = [...capture.operations, ...routed.operations];
  battle.presentation = [{ type: "capture", result: "caught", destination: battle.capture_destination }];
  finalizeBattle(runtime);
  return {
    runtime,
    result: "caught",
    destination: battle.capture_destination,
    operations: battle.last_operations,
    presentation: battle.presentation,
    calculation: capture.capture,
    persistenceRequested: requestsSave(battle.last_operations),
  };
}

export function returnSafariToDayBoard(runtime) {
  const state = maplessState(runtime);
  if (!state.battle?.completed) throw new Error("completed battle is required");
  const target = state.battle.return_target ?? "day_board";
  const summary = {
    decision: state.battle.decision,
    captured: state.battle.captured,
    expGained: state.battle.exp_gained ?? 0,
    reward: state.battle.reward ?? null,
    moneyGained: state.battle.money_gained ?? 0,
    returnTarget: target,
  };
  state.battle = null;
  state.location = target;
  state.notice = target === "village" ? "討伐を終えて村へ戻りました。" : "Day Boardへ戻りました。";
  const operations = [{ op: target === "village" ? "return_to_village" : "return_to_day_board" }];
  state.last_operations = operations;
  return { runtime, target, summary, operations };
}

function persistenceOptions() {
  return { key: SAFARI_PLAYABLE_SAVE_KEY, valueIds: SAFARI_PLAYABLE_VALUE_IDS };
}

export function hasSafariPlayableRun(storage) {
  return hasStoredRun(storage, SAFARI_PLAYABLE_SAVE_KEY);
}

export function saveSafariPlayableRun(storage, runtime) {
  maplessState(runtime);
  return persistRunState(storage, runtime, persistenceOptions());
}

export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = restoreRunState(storage, currentRuntime, persistenceOptions());
  if (!loaded.found) return loaded;
  const state = maplessState(loaded.state);
  if (!("shop" in state)) state.shop = null;
  if (!("location" in state)) state.location = "day_board";
  ensureVillageState(state);
  state.schema_version = 2;
  loaded.state.bag.money = Number(loaded.state.bag.money ?? 0);
  loaded.state.player.party = loaded.state.player.party.map(materializeSafariPokemon);
  loaded.state.storage_system.boxes = loaded.state.storage_system.boxes.map((box) => ({
    ...box,
    slots: box.slots.map((pokemon) => pokemon == null ? pokemon : materializeSafariPokemon(pokemon)),
  }));
  const battle = state.battle;
  if (battle?.foe) battle.foe = materializeSafariPokemon(battle.foe);
  if (battle && !("return_target" in battle)) battle.return_target = "day_board";
  return loaded;
}

export function clearSafariPlayableRun(storage) {
  return clearStoredRun(storage, SAFARI_PLAYABLE_SAVE_KEY);
}

import * as core from "./safari-playable-integration-core.js";
import { quantity, setMoney } from "./bag-economy-mart-flow.js";
import { resolveResolvedShopTransaction } from "./bag-economy-resolved-shop-transaction.js";
import { resolveBrowserTrainerBattleRound } from "./browser-trainer-battle-round-runtime.js";
import {
  canonicalResolvedShopOffer,
  canonicalShopPrice,
  resolveCanonicalBoardShop,
  resolveCanonicalBoardShopType,
} from "./canonical-shop-catalog.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

export * from "./safari-playable-integration-core.js";

const SELL_ITEM_PREFIX = "SELL:";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function randomIndex(length) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError("random length must be positive");
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] % length;
  }
  return Math.floor(Math.random() * length);
}

function canonicalShopSnapshot(shop) {
  return {
    id: shop.id,
    surface: shop.surface,
    canSell: shop.canSell,
    stock: [...shop.stock],
    prices: Object.fromEntries(Object.entries(shop.prices).map(([id, row]) => [id, { ...row }])),
  };
}

function hydrateCanonicalShopEvents(state) {
  if (!Array.isArray(state.board_events)) return state;
  state.board_events = state.board_events.map((event) => {
    if (!event || event.kind !== "shop" || event.canonical_shop) return event;
    const shopType = resolveCanonicalBoardShopType(randomIndex(100));
    const sampleIndices = Array.from({ length: 5 }, () => randomIndex(0x100000000));
    const resolved = resolveCanonicalBoardShop(shopType, { sampleIndices });
    return {
      ...event,
      shop_type: shopType,
      canonical_shop: canonicalShopSnapshot(resolved),
    };
  });
  return state;
}

function installOpenedCanonicalShop(state, index) {
  const event = state.board_events?.[index];
  if (!event?.canonical_shop) return null;
  const resolved = event.canonical_shop;
  state.shop = {
    facility_id: resolved.id,
    board_index: index,
    canonical: true,
    can_sell: Boolean(resolved.canSell),
    stock: [...resolved.stock],
    prices: structuredClone(resolved.prices),
    last_transaction_result: null,
  };
  state.notice = `${resolved.id}の商品を選んでください。`;
  return state.shop;
}

export function createSafariPlayableRuntime() {
  const runtime = core.createSafariPlayableRuntime();
  hydrateCanonicalShopEvents(stateOf(runtime));
  return runtime;
}

export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = core.loadSafariPlayableRun(storage, currentRuntime);
  if (loaded.found) hydrateCanonicalShopEvents(stateOf(loaded.state));
  return loaded;
}

export function activateSafariDayBoardCell(runtime, index) {
  const state = stateOf(runtime);
  hydrateCanonicalShopEvents(state);
  const result = core.activateSafariDayBoardCell(runtime, index);
  if (result.result === "shop_opened") installOpenedCanonicalShop(state, index);
  hydrateCanonicalShopEvents(state);
  return result.result === "shop_opened"
    ? { ...result, notice: state.notice, shop: safariShopPresentation(runtime) }
    : result;
}

export function safariShopPresentation(runtime) {
  const state = stateOf(runtime);
  const shop = state.shop;
  if (!shop?.canonical) return core.safariShopPresentation(runtime);
  const buyItems = shop.stock.map((itemId) => {
    const price = shop.prices[itemId] ?? canonicalShopPrice(itemId);
    return {
      id: itemId,
      canonical_id: itemId,
      transaction_kind: "buy",
      name: itemId,
      label: `購入: ${itemId}`,
      price: Number(price.buyPrice),
      sell_price: Number(price.sellPrice),
      quantity: quantity(runtime.bag?.slots ?? [], itemId),
    };
  });
  const sellItems = shop.can_sell
    ? shop.stock.flatMap((itemId) => {
      const owned = quantity(runtime.bag?.slots ?? [], itemId);
      if (owned <= 0) return [];
      const price = shop.prices[itemId] ?? canonicalShopPrice(itemId);
      return [{
        id: `${SELL_ITEM_PREFIX}${itemId}`,
        canonical_id: itemId,
        transaction_kind: "sell",
        name: itemId,
        label: `売却: ${itemId}`,
        price: Number(price.sellPrice),
        sell_price: Number(price.sellPrice),
        quantity: owned,
      }];
    })
    : [];
  return {
    facilityId: shop.facility_id,
    boardIndex: shop.board_index,
    money: Number(runtime.bag?.money ?? 0),
    canSell: Boolean(shop.can_sell),
    lastTransactionResult: shop.last_transaction_result,
    items: [...buyItems, ...sellItems],
  };
}

function commitCanonicalShopTransaction(runtime, kind, input = {}) {
  const state = stateOf(runtime);
  const shop = state.shop;
  if (!shop?.canonical) throw new Error("active canonical shop is required");
  const itemId = String(input.itemId ?? "");
  if (!shop.stock.includes(itemId)) throw new RangeError("selected item is outside the active shop stock");
  const requestedQuantity = Number(input.quantity);
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    throw new RangeError("shop quantity must be a positive integer");
  }
  const resolvedShop = { stock: shop.stock, canSell: shop.can_sell };
  const offer = canonicalResolvedShopOffer(resolvedShop, itemId, kind);
  const resolved = resolveResolvedShopTransaction({
    offer,
    qty: requestedQuantity,
    slots: runtime.bag.slots,
    money: runtime.bag.money,
    maxSlots: 20,
    maxPerSlot: 99,
    maxMoney: 999999,
  });
  runtime.bag.slots = resolved.slots;
  runtime.bag.money = resolved.money;
  shop.last_transaction_result = resolved.result;
  state.last_operations = [{
    op: "canonical_shop_transaction",
    kind,
    shop: shop.facility_id,
    item: itemId,
    quantity: requestedQuantity,
    unitPrice: offer.unitPrice,
    result: resolved.result,
  }];
  if (resolved.result === "bought" || resolved.result === "sold") state.shop = null;
  state.notice = resolved.result === "bought"
    ? `${itemId}を${requestedQuantity}個購入しました。`
    : resolved.result === "sold"
      ? `${itemId}を${requestedQuantity}個売却しました。`
      : resolved.result === "unavailable"
        ? "この店では売却できません。"
        : `取引できませんでした（${resolved.result}）。`;
  return {
    runtime,
    itemId,
    quantity: requestedQuantity,
    transaction_kind: kind,
    ...resolved,
    operations: state.last_operations,
  };
}

export function purchaseSafariShopItem(runtime, input = {}) {
  if (!stateOf(runtime).shop?.canonical) return core.purchaseSafariShopItem(runtime, input);
  if (input.confirmed === false) return { runtime, result: "cancelled", operations: [] };
  const selectedId = String(input.itemId ?? "");
  if (selectedId.startsWith(SELL_ITEM_PREFIX)) {
    return commitCanonicalShopTransaction(runtime, "sell", {
      ...input,
      itemId: selectedId.slice(SELL_ITEM_PREFIX.length),
    });
  }
  return commitCanonicalShopTransaction(runtime, "buy", input);
}

export function sellSafariShopItem(runtime, input = {}) {
  return commitCanonicalShopTransaction(runtime, "sell", input);
}

function trainerHasReserve(battle) {
  return battle?.kind === "trainer"
    && Array.isArray(battle.trainer_party)
    && Number.isInteger(Number(battle.trainer_party_index))
    && battle.trainer_party.some((pokemon, index) =>
      index !== Number(battle.trainer_party_index) && Number(pokemon?.hp ?? 0) > 0);
}

function battlePresentation(operations) {
  const events = [];
  for (const operation of operations ?? []) {
    if (operation.op === "use_move") {
      events.push({ type: "move_selected", actor: operation.actor, moveId: operation.moveId });
      events.push({ type: "move_started", actor: operation.actor, target: operation.target, moveId: operation.moveId });
    } else if (operation.op === "accuracy_check" && !operation.hit) {
      events.push({ type: "miss", actor: operation.actor, target: operation.target });
    } else if (operation.op === "reduce_hp" || operation.op === "reduce_self_hp") {
      events.push({ type: "damage_applied", actor: operation.actor, target: operation.target, amount: operation.amount, hpBefore: operation.hpBefore, hpAfter: operation.hpAfter });
    } else if (operation.op === "faint" || operation.op === "faint_self") {
      events.push({ type: "faint", target: operation.target });
    } else if (operation.op === "end_of_round" || operation.op === "end_of_round_phase") {
      events.push({ type: "turn_end", turn: operation.battleTurn ?? operation.turn ?? operation.round });
    }
  }
  return events;
}

function trainerBattleExpInput(player, defeatedFoe) {
  const foeMaster = SAFARI_SPECIES_MASTERS[defeatedFoe?.species];
  const speciesMaster = SAFARI_SPECIES_MASTERS[player?.species];
  if (!foeMaster || !speciesMaster) throw new RangeError("trainer EXP species is outside the Safari projection");
  const natureId = player.nature_for_stats_id ?? player.nature_id ?? "HARDY";
  const natureMaster = SAFARI_NATURE_MASTERS[natureId];
  if (!natureMaster) throw new RangeError(`trainer EXP nature is outside the Safari projection: ${natureId}`);
  return {
    maximumExp: 1_000_000,
    maxMoves: 4,
    expContext: {
      defeatedLevel: defeatedFoe.level,
      baseExp: foeMaster.base_exp,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: true,
      moreExpFromTrainerPokemon: true,
      trainerBattle: true,
      scaledExpFormula: false,
      outsiderMultiplier: 1,
    },
    levelThresholds: { 6: 216, 7: 343, 8: 512, 9: 729, 10: 1000 },
    movesByLevel: { 10: ["QUICKATTACK"] },
    moveDecisions: {},
    runtimeMasters: {
      species_master: speciesMaster,
      nature_master: natureMaster,
      move_masters: SAFARI_MOVE_MASTERS,
    },
  };
}

function payTrainerPrize(runtime, state, result) {
  const battle = state.battle;
  if (battle?.kind !== "trainer" || battle.decision !== 1) return result;
  if (battle.trainer_prize_paid) return result;

  const requested = Math.max(0, Math.trunc(Number(battle.prize_money ?? 0)));
  const before = Number(runtime.bag.money ?? 0);
  runtime.bag.money = setMoney(before + requested, 999999);
  const gained = runtime.bag.money - before;
  battle.trainer_prize_paid = true;
  battle.money_gained = gained;

  const moneyOperation = {
    op: "trainer_prize_money",
    requested,
    applied: gained,
    trainer: battle.trainer?.trainer_full_name ?? null,
  };
  battle.last_operations = [...(battle.last_operations ?? []), moneyOperation];
  state.last_operations = [...(state.last_operations ?? []), moneyOperation];

  const cumulativeExp = Number(battle.trainer_exp_gained ?? 0) + Number(battle.exp_gained ?? 0);
  battle.exp_gained = cumulativeExp;
  battle.presentation = (battle.presentation ?? []).map((event) => event.type === "battle_result"
    ? { ...event, expGained: cumulativeExp, moneyGained: gained }
    : event);

  const trainerName = battle.trainer?.trainer_full_name ?? "トレーナー";
  state.notice = `${trainerName}に勝利し、賞金${gained}円を受け取りました。`;
  return {
    ...result,
    operations: battle.last_operations,
    presentation: battle.presentation,
    persistenceRequested: result.persistenceRequested,
  };
}

function resolvePartyAwareTrainerRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  if (!player) throw new Error("active player Pokemon is required");
  const foeMoveId = moveId(battle.foe?.moves?.[0]);
  if (!foeMoveId || !SAFARI_MOVE_MASTERS[foeMoveId]) throw new RangeError(`trainer foe move is outside the Safari projection: ${foeMoveId}`);
  const defeatedFoe = structuredClone(battle.foe);

  const resolved = resolveBrowserTrainerBattleRound({
    roundInput: {
      player,
      foe: battle.foe,
      playerParty: runtime.player.party,
      foeParty: battle.trainer_party,
      playerActivePartyIndex: playerIndex,
      foeActivePartyIndex: Number(battle.trainer_party_index),
      selectedMoveId,
      foeMoveId,
      moveMasters: SAFARI_MOVE_MASTERS,
      playerRandomRoll: 0,
      foeRandomRoll: 0,
      playerBattleExpInput: trainerBattleExpInput(player, defeatedFoe),
    },
    partyOrder: Array.isArray(battle.trainer_party_order) ? battle.trainer_party_order : null,
    idxBattler: 1,
    sideSize: 1,
    playerPartyOrder: Array.isArray(battle.player_party_order) ? battle.player_party_order : null,
    playerIdxBattler: 0,
  });

  const next = resolved.nextRoundState;
  // Terminal outcomes still use the established core finalizer exactly once.
  // Player replacement selection for normal Safari battles is not owned here yet,
  // so preserve the existing path rather than silently auto-selecting a reserve.
  if (Number(next?.decision ?? resolved.decision ?? 0) !== 0 || next?.playerReplacementRequired) return null;

  if (Array.isArray(next.playerParty)) runtime.player.party = structuredClone(next.playerParty);
  else runtime.player.party[playerIndex] = structuredClone(resolved.player);
  battle.player_party_index = Number(next.playerActivePartyIndex ?? playerIndex);
  battle.player_party_order = structuredClone(next.playerPartyOrder ?? battle.player_party_order ?? null);
  battle.trainer_party = structuredClone(next.foeParty);
  battle.trainer_party_index = Number(next.foeActivePartyIndex);
  battle.trainer_party_order = structuredClone(next.partyOrder ?? battle.trainer_party_order ?? null);
  battle.foe = structuredClone(resolved.foe);
  battle.decision = 0;
  battle.completed = false;
  battle.captured = false;
  battle.reward = null;
  battle.money_gained = 0;

  if (resolved.foeReplacementApplied) {
    const expGained = (resolved.expIntegration?.commits ?? []).reduce((sum, commit) => sum + Number(commit.expGained ?? 0), 0);
    battle.trainer_exp_gained = Number(battle.trainer_exp_gained ?? 0) + expGained;
  }
  battle.exp_gained = 0;
  battle.turn += 1;

  const operations = (resolved.presentationOperations ?? resolved.operations ?? []).map((operation) => ({ ...operation, battleTurn: battle.turn - 1 }));
  battle.last_operations = operations;
  battle.presentation = battlePresentation(operations);
  if (resolved.foeReplacementApplied) {
    const trainerName = battle.trainer?.trainer_full_name ?? "トレーナー";
    battle.presentation.push({
      type: "trainer_next",
      actor: "foe",
      trainer: trainerName,
      species: battle.foe?.species ?? null,
      partyIndex: battle.trainer_party_index,
    });
    state.notice = `${trainerName}は${battle.foe?.species ?? "次のポケモン"}を繰り出した！`;
  }
  state.last_operations = operations;

  return {
    ...resolved,
    runtime,
    decision: 0,
    operations,
    presentation: battle.presentation,
    persistenceRequested: false,
  };
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");

  if (trainerHasReserve(battle)) {
    const partyAware = resolvePartyAwareTrainerRound(runtime, selectedMoveId);
    if (partyAware) return partyAware;
  }

  return payTrainerPrize(runtime, state, core.resolveSafariBattleRound(runtime, selectedMoveId));
}

import * as core from "./safari-playable-integration-core.js";
import { quantity, setMoney } from "./bag-economy-mart-flow.js";
import { resolveResolvedShopTransaction } from "./bag-economy-resolved-shop-transaction.js";
import {
  canonicalResolvedShopOffer,
  canonicalShopPrice,
  resolveCanonicalBoardShop,
  resolveCanonicalBoardShopType,
} from "./canonical-shop-catalog.js";

export * from "./safari-playable-integration-core.js";

const SELL_ITEM_PREFIX = "SELL:";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
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
  const resolvedShop = {
    stock: shop.stock,
    canSell: shop.can_sell,
  };
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

function trainerHasNext(battle) {
  return battle?.kind === "trainer"
    && Array.isArray(battle.trainer_party)
    && Number.isInteger(battle.trainer_party_index)
    && battle.trainer_party_index + 1 < battle.trainer_party.length;
}

function snapshotRoundSideEffects(runtime, state) {
  return {
    bagSlots: structuredClone(runtime.bag.slots),
    bagMoney: Number(runtime.bag.money ?? 0),
    boardEvents: structuredClone(state.board_events),
    boardRevealed: structuredClone(state.board_revealed),
    boardConsumed: structuredClone(state.board_consumed),
    boardVisited: structuredClone(state.board_visited),
  };
}

function restoreIntermediateSideEffects(runtime, state, snapshot) {
  runtime.bag.slots = snapshot.bagSlots;
  runtime.bag.money = snapshot.bagMoney;
  state.board_events = snapshot.boardEvents;
  state.board_revealed = snapshot.boardRevealed;
  state.board_consumed = snapshot.boardConsumed;
  state.board_visited = snapshot.boardVisited;
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

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");

  if (!trainerHasNext(battle)) {
    return payTrainerPrize(runtime, state, core.resolveSafariBattleRound(runtime, selectedMoveId));
  }

  const snapshot = snapshotRoundSideEffects(runtime, state);
  const result = core.resolveSafariBattleRound(runtime, selectedMoveId);

  if (result.decision !== 1) return result;

  const gainedExp = Number(state.battle.exp_gained ?? 0);
  const cumulativeExp = Number(state.battle.trainer_exp_gained ?? 0) + gainedExp;
  restoreIntermediateSideEffects(runtime, state, snapshot);

  const nextIndex = state.battle.trainer_party_index + 1;
  const nextFoe = structuredClone(state.battle.trainer_party[nextIndex]);
  state.battle.trainer_party_index = nextIndex;
  state.battle.trainer_exp_gained = cumulativeExp;
  state.battle.foe = nextFoe;
  state.battle.decision = 0;
  state.battle.completed = false;
  state.battle.captured = false;
  state.battle.reward = null;
  state.battle.exp_gained = 0;
  state.battle.money_gained = 0;

  const trainerName = state.battle.trainer?.trainer_full_name ?? "トレーナー";
  const switchOperation = {
    op: "trainer_send_next",
    trainer: trainerName,
    partyIndex: nextIndex,
    species: nextFoe.species,
  };
  state.battle.last_operations = [...(result.operations ?? []).filter((operation) => operation.scope !== "reward"), switchOperation];
  state.battle.presentation = [
    ...(result.presentation ?? []).filter((event) => event.type !== "battle_result"),
    { type: "trainer_next", actor: "foe", trainer: trainerName, species: nextFoe.species, partyIndex: nextIndex },
  ];
  state.last_operations = state.battle.last_operations;
  state.notice = `${trainerName}は${nextFoe.species}を繰り出した！`;

  return {
    ...result,
    decision: 0,
    operations: state.battle.last_operations,
    presentation: state.battle.presentation,
    persistenceRequested: false,
  };
}

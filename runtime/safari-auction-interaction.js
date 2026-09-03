import { resolveAuctionBagEconomyStep } from "./bag-economy-auction-step-integration.js";

const BAG_MAX_SLOTS = 20;
const BAG_MAX_PER_SLOT = 99;
const BAG_MAX_MONEY = 9999999;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function auctionEvent(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "auction") throw new Error("auction normal_event board event is required");
  const products = event.normal_data?.products;
  if (!Array.isArray(products) || products.length !== 3) throw new Error("auction canonical hydration is missing: normal_data.products must contain exactly 3 products");
  for (const [productIndex, product] of products.entries()) {
    if (!product || typeof product !== "object" || !String(product.item ?? "") || !Number.isFinite(Number(product.price))) {
      throw new Error(`auction canonical hydration is malformed at product ${productIndex + 1}`);
    }
    if (!Array.isArray(product.npc_limits) || !Array.isArray(product.npc_active)) {
      throw new Error(`auction canonical NPC hydration is malformed at product ${productIndex + 1}`);
    }
  }
  return event;
}

function currentProductIndex(data) {
  if (data?.won) return -1;
  return (data?.products ?? []).findIndex((product) => product?.finished !== true);
}

function money(runtime) {
  return Math.max(0, Math.trunc(Number(runtime?.bag?.money ?? 0)));
}

function refreshUi(runtime, index) {
  if (typeof globalThis.document === "undefined") return;
  const ui = globalThis.__maplessNormalEventUi;
  if (!ui || ui.runtime !== runtime || Number(ui.boardIndex) !== Number(index) || ui.eventId !== "auction") return;
  const next = safariAuctionPresentation(runtime, index);
  ui.title = next.title;
  ui.message = next.message;
  ui.actions = next.actions;
}

function complete(runtime, index, event, result, notice, operations = []) {
  const state = stateOf(runtime);
  event.normal_resolved = true;
  state.board_events[index] = event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = true;
  state.notice = notice;
  state.last_operations = [
    ...operations.map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"auction_resolved" },
  ];
  return {
    runtime,
    result,
    completed:true,
    consumed:true,
    persistenceRequested:true,
    operations:state.last_operations,
    notice,
  };
}

export function safariAuctionPresentation(runtime, index) {
  const event = auctionEvent(runtime, index);
  const data = event.normal_data;
  const productIndex = currentProductIndex(data);
  if (productIndex < 0) {
    return {
      title:"オークション",
      message:data.won ? "落札品を受け取り、競りを終えます。" : "オークションを後にします。",
      actions:[],
      completed:true,
      productIndex:null,
      product:null,
    };
  }
  const product = data.products[productIndex];
  return {
    title:`オークション ${productIndex + 1} / ${data.products.length}`,
    message:`${product.item}の現在価格は${Math.trunc(Number(product.price))}円です。`,
    actions:[
      { id:"bid_10", label:"10%上乗せして入札", meta:`所持金 ${money(runtime)}円` },
      { id:"bid_25", label:"25%上乗せして入札", meta:`所持金 ${money(runtime)}円` },
      { id:"leave", label:"この商品から降りる", secondary:true },
    ],
    completed:false,
    productIndex,
    product:structuredClone(product),
  };
}

export function resolveSafariAuctionInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = auctionEvent(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const data = event.normal_data;
  let productIndex = currentProductIndex(data);
  if (productIndex < 0) {
    const notice = data.won ? "落札品を受け取り、競りを終えました。" : "オークションを後にしました。";
    return complete(runtime, index, event, data.won ? "auction_won" : "auction_left", notice);
  }

  const action = String(requestedAction ?? "");
  const choice = action === "bid_10" ? 0 : action === "bid_25" ? 1 : action === "leave" ? 2 : null;
  if (choice == null) {
    return {
      runtime,
      result:"unsupported_action",
      completed:false,
      availableActions:["bid_10", "bid_25", "leave"],
      operations:[],
      persistenceRequested:false,
    };
  }

  runtime.bag ??= { slots:[], money:0 };
  const product = data.products[productIndex];
  const settlement = resolveAuctionBagEconomyStep(product, {
    choice,
    slots:runtime.bag.slots ?? [],
    money:runtime.bag.money ?? 0,
    maxSlots:BAG_MAX_SLOTS,
    maxPerSlot:BAG_MAX_PER_SLOT,
    maxMoney:BAG_MAX_MONEY,
  });
  data.products[productIndex] = settlement.facility.product;

  if (settlement.awaiting_choice) {
    const blocked = (settlement.facility.operations ?? []).some((operation) => operation?.op === "message" && /所持金/.test(String(operation.text ?? "")));
    state.notice = blocked
      ? "所持金以上には入札できません。別の入札額を選んでください。"
      : `${data.products[productIndex].item}は${Math.trunc(Number(data.products[productIndex].price))}円まで競り上がりました。`;
    state.last_operations = (settlement.facility.operations ?? []).map((operation) => structuredClone(operation));
    refreshUi(runtime, index);
    return {
      runtime,
      result:blocked ? "insufficient_money" : "awaiting_choice",
      completed:false,
      consumed:false,
      persistenceRequested:false,
      operations:state.last_operations,
      notice:state.notice,
      settlement,
      presentation:safariAuctionPresentation(runtime, index),
    };
  }

  data.products[productIndex].finished = true;
  const won = settlement.won === true;
  if (won) {
    runtime.bag.slots = settlement.slots.map((slot) => [slot[0], Number(slot[1])]);
    runtime.bag.money = settlement.money;
    data.won = true;
  }

  const ownerOperations = [
    ...(settlement.facility.operations ?? []),
    ...(settlement.bagOperations ?? []),
  ];
  if (won) {
    const notice = settlement.result === "fake_won"
      ? "落札品は贋作でした。代金を支払い、競りを終えました。"
      : `${settlement.product.item}を${settlement.spent}円で落札しました。`;
    return complete(runtime, index, event, settlement.result, notice, ownerOperations);
  }

  const refunded = (settlement.facility.operations ?? []).some((operation) => operation?.op === "refund_money");
  productIndex = currentProductIndex(data);
  if (productIndex < 0) {
    return complete(
      runtime,
      index,
      event,
      refunded ? "auction_finished_after_refund" : "auction_left",
      refunded ? "バッグがいっぱいだったため代金は支払わず、オークションを後にしました。" : "オークションを後にしました。",
      ownerOperations,
    );
  }

  state.notice = refunded
    ? "バッグがいっぱいのため購入できませんでした。代金は減っていません。次の商品へ進みます。"
    : "この商品から降りました。次の商品へ進みます。";
  state.last_operations = ownerOperations.map((operation) => structuredClone(operation));
  refreshUi(runtime, index);
  return {
    runtime,
    result:refunded ? "refunded_next_product" : "next_product",
    completed:false,
    consumed:false,
    persistenceRequested:false,
    operations:state.last_operations,
    notice:state.notice,
    settlement,
    presentation:safariAuctionPresentation(runtime, index),
  };
}

import { ensureSafariGeneralData } from "./safari-general-data-demand.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { installMaplessEggShopCustomMoveMastersV108 } from "./mapless-egg-shop-custom-moves-v108.js";
import {
  MAPLESS_EGG_SHOP_CUSTOM_SPECIES_MASTERS_V108,
  MAPLESS_EGG_SHOP_PRICE_V108,
  createMaplessEggShopEggV108,
  maplessEggShopStockForDayV108,
  maplessEggShopTypesV108,
} from "./mapless-egg-shop-v108-flow.js";

const TYPE_LABELS = Object.freeze({
  BUG:"むし",DARK:"あく",DRAGON:"ドラゴン",ELECTRIC:"でんき",FAIRY:"フェアリー",FIGHTING:"かくとう",FIRE:"ほのお",FLYING:"ひこう",GHOST:"ゴースト",GRASS:"くさ",GROUND:"じめん",ICE:"こおり",NORMAL:"ノーマル",POISON:"どく",PSYCHIC:"エスパー",ROCK:"いわ",STEEL:"はがね",WATER:"みず",
});

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function randomInt(limit) {
  const max = Number(limit);
  if (!Number.isSafeInteger(max) || max <= 0 || max > 0x100000000) throw new RangeError("random limit must be 1..2^32");
  if (globalThis.crypto?.getRandomValues) {
    const span = 0x100000000;
    const threshold = span - (span % max);
    const word = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(word); while (word[0] >= threshold);
    return word[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function typeLabel(species) {
  const types = maplessEggShopTypesV108(species);
  return types.map((type) => TYPE_LABELS[type] ?? type).join("/") || "不明";
}

function commitEggShopVisit(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "egg_shop") throw new Error("egg_shop board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", boundary:"battle", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", boundary:"shop", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const operations = [{ op:"egg_shop_visit", index, reusable:true }];
  state.last_operations = operations;
  return { runtime, result:"completed", boundary:"egg_shop", operations };
}

export function safariEggShopPresentation(runtime) {
  const state = stateOf(runtime);
  const stock = maplessEggShopStockForDayV108(state.day);
  return {
    day: Number(state.day),
    money: Number(runtime?.bag?.money ?? 0),
    price: MAPLESS_EGG_SHOP_PRICE_V108,
    partySize: Array.isArray(runtime?.player?.party) ? runtime.player.party.length : 0,
    items: stock.map((species, index) => ({ index, species, typeLabel: typeLabel(species), price: MAPLESS_EGG_SHOP_PRICE_V108 })),
  };
}

export async function purchaseSafariEggShopEgg(runtime, stockIndex, { confirmed = true, randomInt: injectedRandomInt = randomInt, finalPersonalId = null } = {}) {
  const state = stateOf(runtime);
  const stock = maplessEggShopStockForDayV108(state.day);
  const index = Number(stockIndex);
  if (!Number.isInteger(index) || index < 0 || index >= stock.length) return { runtime, result:"invalid_selection", operations:[] };
  if (!confirmed) return { runtime, result:"cancelled", operations:[] };
  if (!Array.isArray(runtime?.player?.party)) return { runtime, result:"player_unavailable", operations:[] };
  if (runtime.player.party.length >= 6) return { runtime, result:"party_full", operations:[] };
  const money = Number(runtime?.bag?.money ?? 0);
  if (money < MAPLESS_EGG_SHOP_PRICE_V108) return { runtime, result:"insufficient_money", operations:[] };

  await ensureSafariGeneralData();
  installMaplessEggShopCustomMoveMastersV108(SAFARI_MOVE_MASTERS);
  const species = stock[index];
  const speciesMaster = MAPLESS_EGG_SHOP_CUSTOM_SPECIES_MASTERS_V108[species] ?? SAFARI_SPECIES_MASTERS[species];
  if (!speciesMaster) return { runtime, result:"species_master_unavailable", species, operations:[] };
  const pid = finalPersonalId == null ? injectedRandomInt(0x100000000) : Number(finalPersonalId) >>> 0;
  const created = createMaplessEggShopEggV108({
    species,
    day: state.day,
    speciesMaster,
    moveMasters: SAFARI_MOVE_MASTERS,
    randomInt: injectedRandomInt,
    finalPersonalId: pid,
  });
  runtime.player.party.push(created.egg);
  runtime.bag.money = money - MAPLESS_EGG_SHOP_PRICE_V108;
  state.notice = "タマゴを受け取りました！ 中身のポケモンは孵化するまで分かりません。";
  const operations = [
    { op:"egg_shop_purchase", day:Number(state.day), stockIndex:index, price:MAPLESS_EGG_SHOP_PRICE_V108, species },
    { op:"request_save", reason:"egg_shop_purchase" },
  ];
  state.last_operations = operations;
  return { runtime, result:"bought", boundary:"egg_shop", species, level:created.level, egg:created.egg, notice:state.notice, operations, persistenceRequested:true };
}

export async function interactiveSafariEggShop(runtime, index) {
  const state = stateOf(runtime);
  const visit = commitEggShopVisit(runtime, index);
  if (visit.result !== "completed") return visit;
  const presentation = safariEggShopPresentation(runtime);
  state.egg_shop_ui = { board_index:index, opened_day:Number(state.day) };
  state.notice = "本日の卵です。タイプを選んでください。中身のポケモンは孵化するまで分かりません。";
  return {
    ...visit,
    runtime,
    result:"egg_shop_opened",
    boundary:"egg_shop",
    eggShop:presentation,
    notice:state.notice,
  };
}

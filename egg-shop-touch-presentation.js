const byId = (id) => document.getElementById(id);
const moneyFormat = new Intl.NumberFormat("ja-JP");
let syncQueued = false;
let purchasing = false;
let lastOpenKey = "";
let eggModulePromise = null;
let webModulePromise = null;
let startupModulePromise = null;

const eggModule = () => eggModulePromise ??= import("./runtime/safari-egg-shop-interaction.js");
const webModule = () => webModulePromise ??= import("./runtime/safari-web-playable-integration.js");
const startupModule = () => startupModulePromise ??= import("./runtime/safari-web-startup.js");

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function activeEggShop() { return state()?.egg_shop_ui ?? null; }

function updateHud() {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState) return;
  const party = byId("party");
  const money = byId("money");
  const notice = byId("notice");
  const mode = byId("mode");
  if (party) party.textContent = `${current.player?.party?.length ?? 0} / 6`;
  if (money) money.textContent = `${moneyFormat.format(Number(current.bag?.money ?? 0))}円`;
  if (notice) notice.textContent = currentState.notice ?? "";
  if (mode && activeEggShop()) mode.textContent = "卵屋";
}

async function restoreBoardAvailability() {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState) return;
  const web = await webModule();
  for (const button of byId("board")?.querySelectorAll("button[data-board-index]") ?? []) {
    const index = Number(button.dataset.boardIndex);
    let disabled = true;
    try {
      const cell = web.boardCellPresentation(current, index);
      disabled = currentState.location !== "day_board" || Boolean(currentState.battle) || Boolean(currentState.shop) || Boolean(cell.disabled);
    } catch (_) {}
    button.disabled = disabled;
  }
  const village = byId("enter-village");
  if (village) village.disabled = currentState.location !== "day_board" || Boolean(currentState.battle) || Boolean(currentState.shop);
}

function lockBoard() {
  for (const button of byId("board")?.querySelectorAll("button[data-board-index]") ?? []) button.disabled = true;
  const village = byId("enter-village");
  if (village) village.disabled = true;
}

function resultMessage(result) {
  if (result === "party_full") return "手持ちがいっぱいでタマゴを受け取れません。";
  if (result === "insufficient_money") return "お金が足りません。";
  if (result === "species_master_unavailable") return "このタマゴのデータを読み込めませんでした。";
  if (result === "invalid_selection") return "タマゴを選び直してください。";
  return "購入できませんでした。";
}

async function sync() {
  syncQueued = false;
  const card = byId("egg-shop-card");
  const current = runtime();
  const currentState = state();
  const active = activeEggShop();
  if (!card || !current || !currentState || !active) {
    if (card) card.hidden = true;
    if (!active) {
      updateHud();
      await restoreBoardAvailability();
    }
    return;
  }

  lockBoard();
  const { safariEggShopPresentation } = await eggModule();
  const shop = safariEggShopPresentation(current);
  card.hidden = false;
  byId("egg-shop-money").textContent = `${moneyFormat.format(shop.money)}円`;
  byId("egg-shop-message").textContent = currentState.notice ?? "本日の卵です。";
  const blocked = purchasing || shop.partySize >= 6 || shop.money < shop.price;
  const buttons = shop.items.map((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "egg-shop-choice";
    button.dataset.eggShopIndex = String(item.index);
    button.disabled = blocked;
    const title = document.createElement("strong");
    title.textContent = `${item.typeLabel}タイプのタマゴ`;
    const meta = document.createElement("small");
    meta.textContent = `${moneyFormat.format(item.price)}円`;
    button.append(title, meta);
    return button;
  });
  byId("egg-shop-choices").replaceChildren(...buttons);
  byId("egg-shop-cancel").disabled = purchasing;
  if (shop.partySize >= 6) byId("egg-shop-message").textContent = "手持ちがいっぱいです。空きを作ってから購入してください。";
  else if (shop.money < shop.price) byId("egg-shop-message").textContent = "お金が足りません。";
  updateHud();

  const openKey = `${shop.day}:${active.board_index}`;
  if (openKey !== lastOpenKey) {
    lastOpenKey = openKey;
    requestAnimationFrame(() => card.scrollIntoView({ behavior:"smooth", block:"start" }));
  }
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => { sync().catch((error) => { globalThis.__maplessLastError = error; console.error("[Mapless] Egg Shop UI sync failed", error); }); });
}

document.addEventListener("click", (event) => {
  if (event.target.closest("#board button[data-board-index]")) {
    setTimeout(scheduleSync, 0);
    setTimeout(scheduleSync, 80);
  }
});

document.addEventListener("click", async (event) => {
  const choice = event.target.closest("button[data-egg-shop-index]");
  if (!choice || purchasing) return;
  const current = runtime();
  if (!current || !activeEggShop()) return;
  purchasing = true;
  await sync();
  try {
    const { purchaseSafariEggShopEgg } = await eggModule();
    const result = await purchaseSafariEggShopEgg(current, Number(choice.dataset.eggShopIndex), { confirmed:true });
    if (result.result === "bought") {
      if (result.persistenceRequested || result.operations?.some((operation) => operation.op === "request_save")) {
        const { saveSafariPlayableRun } = await startupModule();
        saveSafariPlayableRun(window.localStorage, current);
      }
      delete state().egg_shop_ui;
      lastOpenKey = "";
      window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
    } else {
      state().notice = resultMessage(result.result);
    }
  } catch (error) {
    globalThis.__maplessLastError = error;
    state().notice = `卵屋エラー: ${error?.message ?? error}`;
  } finally {
    purchasing = false;
    updateHud();
    await sync();
    if (!activeEggShop()) byId("board-card")?.scrollIntoView({ behavior:"smooth", block:"start" });
  }
});

byId("egg-shop-cancel")?.addEventListener("click", async () => {
  if (purchasing || !activeEggShop()) return;
  delete state().egg_shop_ui;
  state().notice = "Day Boardからマスを選んでください。";
  lastOpenKey = "";
  updateHud();
  await sync();
  byId("board-card")?.scrollIntoView({ behavior:"smooth", block:"start" });
});

const board = byId("board");
if (board) new MutationObserver(scheduleSync).observe(board, { subtree:true, childList:true, attributes:true, attributeFilter:["disabled"] });
const notice = byId("notice");
if (notice) new MutationObserver(scheduleSync).observe(notice, { subtree:true, childList:true, characterData:true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive:true });
window.addEventListener("pageshow", scheduleSync, { passive:true });
scheduleSync();

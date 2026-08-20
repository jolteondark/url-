const byId = (id) => document.getElementById(id);
let syncQueued = false;
let resolving = false;
let lastOpenKey = "";
let webModulePromise = null;
let startupModulePromise = null;
const ownerModules = new Map();

const webModule = () => webModulePromise ??= import("./runtime/safari-web-playable-integration.js");
const startupModule = () => startupModulePromise ??= import("./runtime/safari-web-startup.js");

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function activeNormalEvent() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() ? active : null;
}
function closeNormalEventUi() { globalThis.__maplessNormalEventUi = null; }
function enabledVisible(node) { return Boolean(node && !node.disabled && !node.hidden && node.getClientRects().length > 0); }
function focusFirstEventAction(card) {
  const target = [...card.querySelectorAll("button[data-normal-event-action]")].find(enabledVisible) ?? null;
  if (target) target.focus({ preventScroll:true });
}
function focusBoardAction() {
  const boardCard = byId("board-card");
  if (!boardCard || boardCard.hidden) return;
  const target = [...byId("board")?.querySelectorAll("button[data-board-index]") ?? []].find((button) => enabledVisible(button) && !button.classList.contains("consumed"))
    ?? (enabledVisible(byId("enter-village")) ? byId("enter-village") : null);
  boardCard.scrollIntoView({ behavior:"smooth", block:"start" });
  requestAnimationFrame(() => { if (enabledVisible(target)) target.focus({ preventScroll:true }); });
}

function loadOwner(eventId) {
  if (!ownerModules.has(eventId)) {
    const specifier = {
      street_performer:"./runtime/safari-street-performer-interaction.js",
      mushroom_field:"./runtime/safari-mushroom-field-interaction.js",
      hot_spring:"./runtime/safari-hot-spring-interaction.js",
      fake_nurse:"./runtime/safari-fake-nurse-interaction.js",
      traveling_cook:"./runtime/safari-traveling-cook-interaction.js",
      flooded_river:"./runtime/safari-flooded-river-interaction.js",
    }[eventId];
    if (!specifier) throw new RangeError(`unsupported normal-event UI owner: ${eventId}`);
    ownerModules.set(eventId, import(specifier));
  }
  return ownerModules.get(eventId);
}

async function resolveAction(current, active, actionId) {
  const owner = await loadOwner(active.eventId);
  if (active.eventId === "street_performer") return owner.resolveSafariStreetPerformerInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "mushroom_field") return owner.resolveSafariMushroomFieldInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "hot_spring") return owner.resolveSafariHotSpringInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "fake_nurse") return owner.resolveSafariFakeNurseInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "traveling_cook") {
    return actionId === "leave"
      ? owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, "leave")
      : owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, "pay", actionId);
  }
  if (active.eventId === "flooded_river") return owner.resolveSafariFloodedRiverInteraction(current, active.boardIndex, actionId);
  throw new RangeError(`unsupported normal-event UI owner: ${active.eventId}`);
}

function updateHud() {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState) return;
  const party = byId("party");
  const money = byId("money");
  const notice = byId("notice");
  const mode = byId("mode");
  if (party) party.textContent = `${current.player?.party?.length ?? 0} / 6`;
  if (money) money.textContent = `${new Intl.NumberFormat("ja-JP").format(Number(current.bag?.money ?? 0))}円`;
  if (notice) notice.textContent = currentState.notice ?? "";
  if (mode) mode.textContent = activeNormalEvent() ? "出来事" : (currentState.location === "day_board" ? "探索" : mode.textContent);
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

async function sync() {
  syncQueued = false;
  const card = byId("normal-event-card");
  const current = runtime();
  const currentState = state();
  const active = activeNormalEvent();
  if (!card || !current || !currentState || !active) {
    if (card) card.hidden = true;
    if (!active) {
      updateHud();
      await restoreBoardAvailability();
    }
    return;
  }

  lockBoard();
  card.hidden = false;
  byId("normal-event-title").textContent = active.title;
  byId("normal-event-message").textContent = currentState.notice || active.message;
  const buttons = active.actions.map((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.normalEventAction = action.id;
    button.className = action.secondary ? "secondary normal-event-choice" : "normal-event-choice";
    button.disabled = resolving || action.disabled === true;
    const title = document.createElement("strong");
    title.textContent = action.label;
    button.append(title);
    if (action.meta) {
      const meta = document.createElement("small");
      meta.textContent = action.meta;
      button.append(meta);
    }
    return button;
  });
  byId("normal-event-actions").replaceChildren(...buttons);
  updateHud();

  const openKey = `${active.eventId}:${active.boardIndex}`;
  if (openKey !== lastOpenKey) {
    lastOpenKey = openKey;
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior:"smooth", block:"start" });
      requestAnimationFrame(() => focusFirstEventAction(card));
    });
  }
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => { sync().catch((error) => { globalThis.__maplessLastError = error; console.error("[Mapless] normal-event UI sync failed", error); }); });
}

document.addEventListener("click", (event) => {
  if (event.target.closest("#board button[data-board-index]")) {
    setTimeout(scheduleSync, 0);
    setTimeout(scheduleSync, 80);
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  if (!button || resolving) return;
  const current = runtime();
  const active = activeNormalEvent();
  if (!current || !active) return;
  resolving = true;
  button.blur();
  await sync();
  try {
    const result = await resolveAction(current, active, button.dataset.normalEventAction);
    if (result.persistenceRequested || result.operations?.some((operation) => operation.op === "request_save")) {
      const { saveSafariPlayableRun } = await startupModule();
      saveSafariPlayableRun(window.localStorage, current);
    }
    if (result.completed) {
      closeNormalEventUi();
      lastOpenKey = "";
    }
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } catch (error) {
    globalThis.__maplessLastError = error;
    state().notice = `イベントエラー: ${error?.message ?? error}`;
  } finally {
    resolving = false;
    updateHud();
    await sync();
    if (!activeNormalEvent()) focusBoardAction();
  }
});

const notice = byId("notice");
if (notice) new MutationObserver(scheduleSync).observe(notice, { subtree:true, childList:true, characterData:true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive:true });
window.addEventListener("pageshow", scheduleSync, { passive:true });
scheduleSync();
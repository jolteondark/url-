const byId = (id) => document.getElementById(id);
let syncQueued = false;
let resolving = false;
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
function berryCount(current) {
  return (current?.bag?.slots ?? [])
    .filter((slot) => Array.isArray(slot) && /BERRY$/i.test(String(slot[0] ?? "")))
    .reduce((sum, slot) => sum + Math.max(0, Math.trunc(Number(slot[1]) || 0)), 0);
}

async function displayActionsFor(current, active) {
  if (active.eventId === "street_performer") {
    const owner = await loadOwner(active.eventId);
    const scale = Math.max(Math.floor((Math.max(1, Number(state()?.day) || 1) - 1) / 5), 0);
    const price = 300 + scale * 30;
    const actions = await owner.safariStreetPerformerChoices(current);
    if (actions.length === 0) actions.push({ id:"no_performer", label:"芸を披露できるポケモンがいません", disabled:true });
    actions.push(
      { id:"watch", label:"芸を見る", meta:`${price}円 · 手持ち10%回復` },
      { id:"callout", label:"詐欺ではないか指摘する", meta:"本物ならそのまま終了 · 詐欺ならトレーナー戦" },
      { id:"leave", label:"立ち去る", secondary:true },
    );
    return actions;
  }
  if (active.eventId !== "traveling_cook") return active.actions;
  const count = berryCount(current);
  return [
    { id:"pay:heal", label:"回復料理をお金で頼む", meta:active.actions.find((action) => action.id === "heal")?.meta ?? "HP50%回復" },
    { id:"pay:medicine", label:"薬膳料理をお金で頼む", meta:active.actions.find((action) => action.id === "medicine")?.meta ?? "状態異常回復" },
    { id:"berries:heal", label:"きのみ3個で回復料理", meta:`所持きのみ ${count}個 · HP50%回復`, disabled:count < 3 },
    { id:"berries:medicine", label:"きのみ3個で薬膳料理", meta:`所持きのみ ${count}個 · 状態異常回復`, disabled:count < 3 },
    { id:"prototype", label:"試作品を食べてみる", meta:"回復・薬効・強化料理・混乱・ダメージのいずれか" },
    { id:"leave", label:"立ち去る", secondary:true },
  ];
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
      burning_wagon:"./runtime/safari-burning-wagon-interaction.js",
      meteor_fragment:"./runtime/safari-meteor-fragment-interaction.js",
      honey_tree:"./runtime/safari-honey-tree-interaction.js",
      lost_pokemon:"./runtime/safari-lost-pokemon-interaction.js",
      photographer:"./runtime/safari-photographer-interaction.js",
      pokemon_nest:"./runtime/safari-pokemon-nest-interaction.js",
      sleeping_giant:"./runtime/safari-sleeping-giant-interaction.js",
      berry_thief:"./runtime/safari-berry-thief-interaction.js",
      wounded_pokemon:"./runtime/safari-wounded-pokemon-integration.js",
      treasure_chest:"./runtime/safari-treasure-chest-interaction.js",
      miner:"./runtime/safari-miner-interaction.js",
      tavern:"./runtime/safari-tavern-interaction.js",
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
    if (actionId === "leave") return owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, "leave");
    if (actionId === "prototype") return owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, "prototype");
    if (String(actionId).startsWith("berries:")) return owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, "berries", String(actionId).slice(8));
    if (String(actionId).startsWith("pay:")) return owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, "pay", String(actionId).slice(4));
    return owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, "pay", actionId);
  }
  if (active.eventId === "flooded_river") return owner.resolveSafariFloodedRiverInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "burning_wagon") return owner.resolveSafariBurningWagonInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "meteor_fragment") return owner.resolveSafariMeteorFragmentInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "honey_tree") return owner.resolveSafariHoneyTreeInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "lost_pokemon") return owner.resolveSafariLostPokemonInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "photographer") return owner.resolveSafariPhotographerInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "pokemon_nest") return owner.resolveSafariPokemonNestInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "sleeping_giant") return owner.resolveSafariSleepingGiantInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "berry_thief") return owner.resolveSafariBerryThiefInteraction(current, active.boardIndex, actionId);
  if (active.eventId === "wounded_pokemon") {
    const input = actionId === "leave"
      ? { choice:"leave" }
      : { choice:"treat", itemId:String(actionId).startsWith("treat:") ? String(actionId).slice(6) : "" };
    const result = owner.resolveSafariWoundedPokemonDecision(current, active.boardIndex, input);
    return { ...result, completed:Boolean(current.variables?.mapless?.board_consumed?.[active.boardIndex]) };
  }
  if (active.eventId === "treasure_chest") return owner.resolveSafariTreasureChest(current, active.boardIndex, actionId);
  if (active.eventId === "miner") return owner.resolveSafariMinerAction(current, active.boardIndex, actionId);
  if (active.eventId === "tavern") return owner.resolveSafariTavernAction(current, active.boardIndex, actionId);
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

async function ensurePendingContinuationOwner(currentState) {
  const pending = currentState?.normal_event_battle_continuation;
  if (!pending || pending.committed === true) return;
  const eventId = String(pending.event_id ?? "");
  if (!eventId) return;
  await loadOwner(eventId);
}

async function sync() {
  syncQueued = false;
  const card = byId("normal-event-card");
  const current = runtime();
  const currentState = state();
  const active = activeNormalEvent();
  if (currentState) await ensurePendingContinuationOwner(currentState);
  if (!card || !current || !currentState || !active) {
    const wasVisible = Boolean(card && !card.hidden);
    if (card) card.hidden = true;
    if (!active) {
      updateHud();
      await restoreBoardAvailability();
      if (wasVisible) window.dispatchEvent(new CustomEvent("safari-normal-event-closed"));
    }
    return;
  }

  lockBoard();
  card.hidden = false;
  byId("normal-event-title").textContent = active.title;
  byId("normal-event-message").textContent = currentState.notice || active.message;
  const actions = await displayActionsFor(current, active);
  const buttons = actions.map((action) => {
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
  window.dispatchEvent(new CustomEvent("safari-normal-event-rendered"));
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => { sync().catch((error) => { globalThis.__maplessLastError = error; console.error("[Mapless] normal-event UI sync failed", error); }); });
}

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
    if (result.completed) closeNormalEventUi();
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } catch (error) {
    globalThis.__maplessLastError = error;
    state().notice = `イベントエラー: ${error?.message ?? error}`;
  } finally {
    resolving = false;
    updateHud();
    await sync();
  }
});

window.addEventListener("safari-normal-event-ui", scheduleSync, { passive:true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive:true });
window.addEventListener("pageshow", scheduleSync, { passive:true });
scheduleSync();
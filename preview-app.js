import {
  SAFARI_MOVE_PRESENTATION,
  acceptSafariVillageBounty,
  activateSafariDayBoardCell,
  attemptSafariCapture,
  boardCellPresentation,
  clearSafariPlayableRun,
  createSafariPlayableRuntime,
  enterSafariVillage,
  hasSafariPlayableRun,
  leaveSafariShop,
  leaveSafariVillage,
  loadSafariPlayableRun,
  purchaseSafariShopItem,
  resolveSafariBattleRound,
  returnSafariToDayBoard,
  safariShopPresentation,
  safariVillagePresentation,
  saveSafariPlayableRun,
  setSafariPartyLead,
  startSafariVillageBounty,
} from "./runtime/safari-web-playable-integration.js";
import {
  ensureSafariGeneralCombatData,
  ensureSafariGeneralData,
  safariGeneralCombatReady,
  safariGeneralDataReady,
} from "./runtime/safari-general-data-demand.js";

let runtime = createSafariPlayableRuntime();
let busy = false;
let logLines = ["real domain縦線を開始しました。"];
let fixedShopModulePromise = null;
let fleeModulePromise = null;
const byId = (id) => document.getElementById(id);
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const moveId = (move) => typeof move === "string" ? move : move.id;
const moneyFormat = new Intl.NumberFormat("ja-JP");
const fixedShopModule = () => fixedShopModulePromise ??= import("./runtime/safari-village-fixed-shop-integration.js");
const fleeModule = () => fleeModulePromise ??= import("./runtime/safari-flee-command.js?v=20260818-1335");

function mapless() {
  return runtime.variables.mapless;
}

function activeBattlePlayer(battle = mapless().battle) {
  const index = Number(battle?.player_party_index ?? 0);
  return runtime.player.party[index] ?? runtime.player.party[0];
}

function potionQuantity() {
  return runtime.bag.slots
    .filter((slot) => slot && slot[0] === "POTION")
    .reduce((total, slot) => total + Number(slot[1]), 0);
}

function storedCount() {
  return runtime.storage_system.boxes.reduce(
    (total, box) => total + box.slots.filter(Boolean).length,
    0,
  );
}

function note(message) {
  logLines.unshift(message);
  logLines = logLines.slice(0, 20);
  renderLog();
}

function autoSaveIfRequested(result, label) {
  const requested = result?.persistenceRequested
    || result?.operations?.some((operation) => operation.op === "request_save");
  if (!requested) return;
  const saved = saveSafariPlayableRun(window.localStorage, runtime);
  note(`${label}: ${saved.key}`);
}

function renderLog() {
  byId("log").replaceChildren(...logLines.map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  }));
}

function percent(hp, maxHp) {
  if (!maxHp) return 0;
  return Math.max(0, Math.min(100, (Number(hp) / Number(maxHp)) * 100));
}

function boardActionGeneralMode(index) {
  const event = mapless().board_events?.[index];
  if (event?.kind === "wild" || event?.kind === "trainer") return "combat";
  if (event?.kind === "normal_event" && event.normal_event_id === "wounded_pokemon") return "masters";
  return null;
}

async function ensureBoardActionData(index) {
  const mode = boardActionGeneralMode(index);
  if (mode === "combat" && !safariGeneralCombatReady()) {
    note("戦闘データを読み込んでいます…");
    await ensureSafariGeneralCombatData();
  } else if (mode === "masters" && !safariGeneralDataReady()) {
    note("ポケモンデータを読み込んでいます…");
    await ensureSafariGeneralData();
  }
}

function renderBoard() {
  const state = mapless();
  const battle = state.battle;
  const shop = state.shop;
  const buttons = Array.from({ length: 8 }, (_, index) => {
    const cell = boardCellPresentation(runtime, index);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.boardIndex = String(index);
    button.className = "board-cell" + (cell.revealed ? " revealed" : "") + (cell.consumed ? " consumed" : "");
    button.disabled = busy || state.location !== "day_board" || Boolean(battle) || Boolean(shop) || cell.disabled;
    const number = document.createElement("span");
    number.className = "cell-number";
    number.textContent = String(index + 1);
    const label = document.createElement("strong");
    label.textContent = cell.label;
    button.append(number, label);
    return button;
  });
  byId("board").replaceChildren(...buttons);
  byId("enter-village").disabled = busy || state.location !== "day_board" || Boolean(battle) || Boolean(shop);
}

function renderShop() {
  const shop = safariShopPresentation(runtime);
  const card = byId("shop-card");
  card.hidden = !shop;
  if (!shop) return;
  if (byId("shop-title")) byId("shop-title").textContent = shop.facilityId ?? "ショップ";
  byId("shop-money").textContent = moneyFormat.format(shop.money) + "円";
  const select = byId("shop-item");
  const selected = select.value;
  const options = shop.items.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label + " / " + moneyFormat.format(item.price) + "円 / 所持 " + item.quantity;
    return option;
  });
  select.replaceChildren(...options);
  if (shop.items.some((item) => item.id === selected)) select.value = selected;
  select.disabled = busy;
  byId("shop-quantity").disabled = busy;
  byId("shop-confirm").disabled = busy;
  byId("shop-cancel").disabled = busy;
  byId("shop-message").textContent = mapless().notice;
}

function renderVillage() {
  const state = mapless();
  const village = safariVillagePresentation(runtime);
  const card = byId("village-card");
  card.hidden = !village.active || Boolean(state.battle);
  if (card.hidden) return;
  const shopOpen = Boolean(state.shop);
  byId("village-actions").textContent = `行動 ${village.actionsLeft} / ${village.actionLimit}`;
  byId("bounty-message").textContent = state.notice;
  const quest = village.quest;
  byId("bounty-species").textContent = quest
    ? `${quest.prefix ?? ""}${quest.speciesName}`
    : "現在の依頼はありません";
  byId("bounty-level").textContent = quest ? `Lv.${quest.level}` : "-";
  byId("bounty-reward").textContent = quest ? `賞金 ${moneyFormat.format(quest.reward)}円` : "-";
  byId("bounty-accept").hidden = village.hasActiveBounty;
  byId("bounty-accept").disabled = busy || shopOpen || !quest || village.boardLocked || village.actionsLeft <= 0;
  byId("bounty-depart").hidden = !village.hasActiveBounty;
  byId("bounty-depart").disabled = busy || shopOpen || !village.hasActiveBounty || village.actionsLeft <= 0 || village.ablePokemonCount <= 0;
  if (byId("village-shop-select")) byId("village-shop-select").disabled = busy || shopOpen;
  if (byId("village-shop-open")) byId("village-shop-open").disabled = busy || shopOpen;
  byId("leave-village").disabled = busy || shopOpen;
}

function renderMoves(player, battle) {
  if (!battle || battle.completed) {
    byId("moves").replaceChildren();
    return;
  }
  const buttons = player.moves
    .map((move) => ({ move, id: moveId(move) }))
    .filter(({ id }) => SAFARI_MOVE_PRESENTATION[id])
    .map(({ move, id }) => {
      const details = SAFARI_MOVE_PRESENTATION[id];
      const pp = typeof move === "string" ? details.totalPp : move.pp;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.moveId = id;
      button.disabled = busy || pp <= 0;
      const name = document.createElement("strong");
      name.textContent = details.name;
      const meta = document.createElement("small");
      meta.textContent = "威力 " + details.power + " / PP " + pp
        + (details.priority ? " / 優先度 +" + details.priority : "");
      button.append(name, meta);
      return button;
    });
  byId("moves").replaceChildren(...buttons);
}

function renderBattle() {
  const battle = mapless().battle;
  const card = byId("battle-card");
  card.hidden = !battle;
  if (!battle) return;
  const player = activeBattlePlayer(battle);
  const foe = battle.foe;
  byId("battle-title").textContent = battle.origin === "village_bounty"
    ? "Bounty Battle"
    : battle.kind === "trainer" ? "Trainer Battle" : "Wild Battle";
  byId("turn").textContent = battle.completed ? "Result" : "Turn " + battle.turn;
  byId("player-name").textContent = player.species;
  byId("player-level").textContent = "Lv." + player.level;
  byId("player-hp").textContent = player.hp + " / " + player.max_hp;
  byId("player-hp-bar").style.width = percent(player.hp, player.max_hp) + "%";
  byId("foe-name").textContent = foe.species;
  byId("foe-level").textContent = "Lv." + foe.level;
  byId("foe-hp").textContent = foe.hp + " / " + foe.max_hp;
  byId("foe-hp-bar").style.width = percent(foe.hp, foe.max_hp) + "%";
  byId("battle-message").textContent = battle.completed
    ? mapless().notice
    : "技を選んでください。";
  renderMoves(player, battle);
  byId("capture").hidden = battle.kind !== "wild" || battle.completed;
  byId("capture").disabled = busy;
  const flee = byId("flee");
  const canFlee = battle.kind === "wild" && battle.origin !== "village_bounty" && !battle.completed;
  flee.hidden = battle.completed;
  flee.disabled = busy || !canFlee;
  flee.textContent = canFlee ? "にげる" : "にげられない";
  byId("return-board").hidden = !battle.completed;
  byId("return-board").disabled = busy;
  byId("return-board").textContent = battle.return_target === "village"
    ? "村へ戻る"
    : battle.return_target === "home" ? "ホームへ" : "Day Boardへ戻る";
}

function render() {
  const state = mapless();
  byId("board-card").hidden = state.location === "village";
  const boardTitle = byId("board-card")?.querySelector("h2");
  if (boardTitle) boardTitle.textContent = state.location === "home" ? "Run End" : "Day Board";
  byId("day").textContent = String(state.day);
  byId("party").textContent = runtime.player.party.length + " / 6";
  byId("storage").textContent = String(storedCount());
  byId("bag").textContent = String(potionQuantity());
  byId("money").textContent = moneyFormat.format(Number(runtime.bag.money ?? 0)) + "円";
  byId("notice").textContent = state.notice;
  byId("mode").textContent = state.battle
    ? "戦闘"
    : state.shop ? "ショップ"
      : state.location === "village" ? "村"
        : state.location === "home" ? "ラン終了" : "探索";
  try {
    byId("continue-run").disabled = busy || !hasSafariPlayableRun(window.localStorage);
  } catch (_) {
    byId("continue-run").disabled = true;
  }
  byId("new-run").disabled = busy || Boolean(state.mapless_carryover_pending);
  byId("save-run").disabled = busy;
  renderBoard();
  renderShop();
  renderVillage();
  renderBattle();
  renderLog();
}

async function playPresentation(events) {
  for (const event of events) {
    if (event.type === "move_started") {
      const actor = byId(event.actor + "-combatant");
      actor.classList.add("lunge");
      await sleep(150);
      actor.classList.remove("lunge");
      note((SAFARI_MOVE_PRESENTATION[event.moveId]?.name ?? event.moveId) + "！");
    } else if (event.type === "damage_applied") {
      const target = byId(event.target + "-combatant");
      const battle = mapless().battle;
      const pokemon = event.target === "player" ? activeBattlePlayer(battle) : battle.foe;
      byId(event.target + "-hp").textContent = event.hpAfter + " / " + pokemon.max_hp;
      byId(event.target + "-hp-bar").style.width = percent(event.hpAfter, pokemon.max_hp) + "%";
      target.classList.add("hit");
      await sleep(180);
      target.classList.remove("hit");
      note(event.target + " HP " + event.hpBefore + " → " + event.hpAfter);
    } else if (event.type === "miss") {
      note(event.actor + "の攻撃は外れた。");
    } else if (event.type === "faint") {
      note(event.target + " faint");
    } else if (event.type === "turn_end") {
      note("Turn " + event.turn + " end");
    } else if (event.type === "battle_result") {
      note("Battle result: decision " + event.decision);
      if (event.expGained) note("EXP +" + event.expGained);
      if (event.reward?.item) note(event.reward.item + "+" + event.reward.quantity);
      if (event.moneyGained) note("Money +" + moneyFormat.format(event.moneyGained) + "円");
    } else if (event.type === "capture") {
      note("Capture → " + event.destination);
    }
  }
}

function snapshotBoardCombatState(index) {
  const state = mapless();
  const event = state.board_events?.[index];
  if (event?.kind !== "wild" && event?.kind !== "trainer") return null;
  return {
    board_events: state.board_events,
    board_revealed: state.board_revealed,
    board_consumed: state.board_consumed,
    battle: state.battle,
    notice: state.notice,
    last_operations: state.last_operations,
    hadEncounterSeed: Object.prototype.hasOwnProperty.call(state, "preview_encounter_seed"),
    encounterSeed: state.preview_encounter_seed,
    hadEncounterCounter: Object.prototype.hasOwnProperty.call(state, "preview_encounter_counter"),
    encounterCounter: state.preview_encounter_counter,
  };
}

function restoreBoardCombatState(snapshot) {
  if (!snapshot) return;
  const state = mapless();
  state.board_events = snapshot.board_events;
  state.board_revealed = snapshot.board_revealed;
  state.board_consumed = snapshot.board_consumed;
  state.battle = snapshot.battle;
  state.notice = snapshot.notice;
  state.last_operations = snapshot.last_operations;
  if (snapshot.hadEncounterSeed) state.preview_encounter_seed = snapshot.encounterSeed;
  else delete state.preview_encounter_seed;
  if (snapshot.hadEncounterCounter) state.preview_encounter_counter = snapshot.encounterCounter;
  else delete state.preview_encounter_counter;
}

byId("board").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || busy) return;
  const index = Number(button.dataset.boardIndex);
  const combatSnapshot = snapshotBoardCombatState(index);
  busy = true;
  render();
  try {
    await ensureBoardActionData(index);
    const result = await activateSafariDayBoardCell(runtime, index);
    note(result.boundary + ": " + result.result);
    if (mapless().battle) {
      window.setTimeout(() => byId("battle-card").scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } else if (mapless().shop) {
      window.setTimeout(() => byId("shop-card").scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  } catch (error) {
    note("Day Board error: " + (error?.message ?? error));
  } finally {
    busy = false;
    try {
      render();
    } catch (error) {
      globalThis.__maplessLastError = error;
      if (combatSnapshot && combatSnapshot.battle == null && mapless().battle) {
        restoreBoardCombatState(combatSnapshot);
        try { render(); } catch (_) {}
      }
      throw error;
    }
  }
});

byId("enter-village").addEventListener("click", async () => {
  if (busy) return;
  try {
    const result = await enterSafariVillage(runtime);
    note("Village: " + result.result);
  } catch (error) {
    note("Village entry error: " + (error?.message ?? error));
  }
  render();
  byId("village-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("village-shop-open")?.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  render();
  try {
    const { openSafariVillageFixedShop } = await fixedShopModule();
    const result = openSafariVillageFixedShop(runtime, byId("village-shop-select").value);
    note("Village shop: " + result.shop.facility_id);
  } catch (error) {
    note("Village shop error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
  if (mapless().shop) byId("shop-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("bounty-accept").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  render();
  try {
    const result = await acceptSafariVillageBounty(runtime, { choice: 0, confirmed: true });
    note("Bounty accept: " + result.accepted);
    autoSaveIfRequested(result, "Bounty acceptance auto-save");
  } catch (error) {
    note("Bounty accept error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
});

byId("bounty-depart").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  render();
  try {
    const result = await startSafariVillageBounty(runtime);
    note("Bounty depart: " + result.result);
  } catch (error) {
    note("Bounty depart error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
  if (mapless().battle) byId("battle-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("leave-village").addEventListener("click", async () => {
  if (busy) return;
  try {
    const result = await leaveSafariVillage(runtime);
    note("Village: " + result.result);
  } catch (error) {
    note("Village return error: " + (error?.message ?? error));
  }
  render();
  byId("board-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("shop-confirm").addEventListener("click", async () => {
  if (busy) return;
  const itemId = byId("shop-item").value;
  const quantity = Number(byId("shop-quantity").value);
  const villageShop = Boolean(mapless().shop?.village_fixed_shop);
  busy = true;
  render();
  try {
    let result;
    if (villageShop) {
      const { purchaseSafariVillageFixedShopItem } = await fixedShopModule();
      result = purchaseSafariVillageFixedShopItem(runtime, { itemId, quantity });
    } else {
      result = await purchaseSafariShopItem(runtime, { itemId, quantity, confirmed: true });
    }
    note("Shop transaction: " + result.transaction_result);
    autoSaveIfRequested(result, "Shop transaction auto-save");
  } catch (error) {
    note("Shop error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
  if (!mapless().shop) byId(villageShop ? "village-card" : "board-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("shop-cancel").addEventListener("click", async () => {
  if (busy) return;
  const villageShop = Boolean(mapless().shop?.village_fixed_shop);
  try {
    let result;
    if (villageShop) {
      const { leaveSafariVillageFixedShop } = await fixedShopModule();
      result = leaveSafariVillageFixedShop(runtime);
    } else {
      result = await leaveSafariShop(runtime);
    }
    note("Shop: " + result.result);
  } catch (error) {
    note("Shop return error: " + (error?.message ?? error));
  }
  render();
  byId(villageShop ? "village-card" : "board-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("moves").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-move-id]");
  if (!button || busy) return;
  busy = true;
  render();
  try {
    const result = await resolveSafariBattleRound(runtime, button.dataset.moveId);
    await playPresentation(result.presentation);
    autoSaveIfRequested(result, "Battle result auto-save");
  } catch (error) {
    note("Battle error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
});

byId("capture").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  render();
  try {
    const result = await attemptSafariCapture(runtime);
    await playPresentation(result.presentation);
    if (result.result === "caught") note("捕獲先: " + result.destination);
    else note("Capture: " + result.result);
    autoSaveIfRequested(result, "Capture result auto-save");
  } catch (error) {
    note("Capture error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
});

byId("flee").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  render();
  let escaped = false;
  try {
    const { attemptSafariFlee } = await fleeModule();
    const result = attemptSafariFlee(runtime);
    await playPresentation(result.presentation ?? []);
    escaped = result.escaped;
    note(result.escaped ? "Battle: escaped" : "Battle: escape blocked");
    autoSaveIfRequested(result, "Battle flee auto-save");
  } catch (error) {
    note("Flee error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
  if (escaped) byId("board-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("return-board").addEventListener("click", async () => {
  let target = "day_board";
  try {
    const result = await returnSafariToDayBoard(runtime);
    target = result.target;
    autoSaveIfRequested(result, "Run end auto-save");
    note((target === "village" ? "Village" : target === "home" ? "Home" : "Day Board") + " return / decision " + result.summary.decision);
  } catch (error) {
    note("Return error: " + (error?.message ?? error));
  }
  render();
  byId(target === "village" ? "village-card" : "board-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

byId("save-run").addEventListener("click", () => {
  try {
    const saved = saveSafariPlayableRun(window.localStorage, runtime);
    note("Persistence save: " + saved.key);
  } catch (error) {
    note("Save error: " + (error?.name ?? "Error"));
  }
  render();
});

byId("continue-run").addEventListener("click", () => {
  try {
    const loaded = loadSafariPlayableRun(window.localStorage, runtime);
    if (!loaded.found) note("保存データはありません。");
    else {
      runtime = loaded.state;
      note("Persistence load: " + loaded.key);
    }
  } catch (error) {
    note("Load error: " + (error?.name ?? "Error"));
  }
  render();
});

byId("new-run").addEventListener("click", () => {
  if (mapless().mapless_carryover_pending) {
    note("ラン終了。次ランの持ち込み選択待ちです。");
    render();
    return;
  }
  try { clearSafariPlayableRun(window.localStorage); } catch (_) {}
  runtime = createSafariPlayableRuntime();
  logLines = ["新規ランを開始しました。"];
  render();
  window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
});

window.addEventListener("safari-preview-start", (event) => {
  if (event.detail?.action === "continue") {
    try {
      const loaded = loadSafariPlayableRun(window.localStorage, runtime);
      if (!loaded.found) note("保存データはありません。");
      else {
        runtime = loaded.state;
        note("Persistence load: " + loaded.key);
      }
    } catch (error) {
      note("Load error: " + (error?.name ?? error));
    }
    render();
    return;
  }
  if (event.detail?.action === "new") {
    if (mapless().mapless_carryover_pending) {
      note("ラン終了。次ランの持ち込み選択待ちです。");
      render();
      return;
    }
    try { clearSafariPlayableRun(window.localStorage); } catch (_) {}
    runtime = createSafariPlayableRuntime();
    logLines = ["新規ランを開始しました。"];
    render();
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  }
});

window.addEventListener("safari-party-lead-request", async (event) => {
  if (busy) return;
  try {
    const result = await setSafariPartyLead(runtime, Number(event.detail?.index));
    const saved = saveSafariPlayableRun(window.localStorage, runtime);
    note(`${result.notice} / auto-save: ${saved.key}`);
  } catch (error) {
    note("Party error: " + (error?.message ?? error));
  }
  render();
  window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
});

window.addEventListener("safari-runtime-changed", render);
window.addEventListener("pageshow", render);
render();
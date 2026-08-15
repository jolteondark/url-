import {
  SAFARI_MOVE_PRESENTATION,
  activateSafariDayBoardCell,
  attemptSafariCapture,
  boardCellPresentation,
  clearSafariPlayableRun,
  createSafariPlayableRuntime,
  hasSafariPlayableRun,
  loadSafariPlayableRun,
  resolveSafariBattleRound,
  returnSafariToDayBoard,
  saveSafariPlayableRun,
} from "./runtime/safari-playable-integration.js";

let runtime = createSafariPlayableRuntime();
let busy = false;
let logLines = ["real domain縦線を開始しました。"];
const byId = (id) => document.getElementById(id);
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const moveId = (move) => typeof move === "string" ? move : move.id;

function mapless() {
  return runtime.variables.mapless;
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
}

function percent(hp, maxHp) {
  if (!maxHp) return 0;
  return Math.max(0, Math.min(100, (Number(hp) / Number(maxHp)) * 100));
}

function renderBoard() {
  const battle = mapless().battle;
  const buttons = Array.from({ length: 8 }, (_, index) => {
    const cell = boardCellPresentation(runtime, index);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.boardIndex = String(index);
    button.className = "board-cell" + (cell.revealed ? " revealed" : "") + (cell.consumed ? " consumed" : "");
    button.disabled = busy || Boolean(battle) || cell.disabled;
    const number = document.createElement("span");
    number.className = "cell-number";
    number.textContent = String(index + 1);
    const label = document.createElement("strong");
    label.textContent = cell.label;
    button.append(number, label);
    return button;
  });
  byId("board").replaceChildren(...buttons);
}

function renderMoves(player, battle) {
  if (!battle || battle.completed) {
    byId("moves").replaceChildren();
    return;
  }
  const buttons = player.moves
    .map(moveId)
    .filter((id) => SAFARI_MOVE_PRESENTATION[id])
    .map((id) => {
      const details = SAFARI_MOVE_PRESENTATION[id];
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.moveId = id;
      button.disabled = busy;
      const name = document.createElement("strong");
      name.textContent = details.name;
      const meta = document.createElement("small");
      meta.textContent = "威力入力 " + details.damage + (details.priority ? " / 優先度 +" + details.priority : "");
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
  const player = runtime.player.party[0];
  const foe = battle.foe;
  byId("battle-title").textContent = battle.kind === "trainer" ? "Trainer Battle" : "Wild Battle";
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
  byId("return-board").hidden = !battle.completed;
  byId("return-board").disabled = busy;
}

function render() {
  const state = mapless();
  byId("day").textContent = String(state.day);
  byId("party").textContent = runtime.player.party.length + " / 6";
  byId("storage").textContent = String(storedCount());
  byId("bag").textContent = String(potionQuantity());
  byId("notice").textContent = state.notice;
  byId("mode").textContent = state.battle ? "戦闘" : "探索";
  try {
    byId("continue-run").disabled = busy || !hasSafariPlayableRun(window.localStorage);
  } catch (_) {
    byId("continue-run").disabled = true;
  }
  byId("new-run").disabled = busy;
  byId("save-run").disabled = busy;
  renderBoard();
  renderBattle();
  byId("log").replaceChildren(...logLines.map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  }));
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
      target.classList.add("hit");
      render();
      await sleep(180);
      target.classList.remove("hit");
      note(event.target + " HP " + event.hpBefore + " → " + event.hpAfter);
    } else if (event.type === "faint") {
      note(event.target + " faint");
    } else if (event.type === "battle_result") {
      note("Battle result: decision " + event.decision);
      if (event.expGained) note("EXP +" + event.expGained);
      if (event.reward) note(event.reward.item + " +" + event.reward.quantity);
    } else if (event.type === "capture") {
      note("Capture → " + event.destination);
    }
  }
}

byId("board").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || busy) return;
  try {
    const result = activateSafariDayBoardCell(runtime, Number(button.dataset.boardIndex));
    note(result.boundary + ": " + result.result);
    if (mapless().battle) {
      window.setTimeout(() => byId("battle-card").scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  } catch (error) {
    note("Day Board error: " + (error?.message ?? error));
  }
  render();
});

byId("moves").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-move-id]");
  if (!button || busy) return;
  busy = true;
  render();
  try {
    const result = resolveSafariBattleRound(runtime, button.dataset.moveId);
    render();
    await playPresentation(result.presentation);
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
    const result = attemptSafariCapture(runtime);
    await playPresentation(result.presentation);
    note("捕獲先: " + result.destination);
  } catch (error) {
    note("Capture error: " + (error?.message ?? error));
  } finally {
    busy = false;
    render();
  }
});

byId("return-board").addEventListener("click", () => {
  try {
    const result = returnSafariToDayBoard(runtime);
    note("Day Board return / decision " + result.summary.decision);
  } catch (error) {
    note("Return error: " + (error?.message ?? error));
  }
  render();
  byId("board-card").scrollIntoView({ behavior: "smooth", block: "start" });
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
  try { clearSafariPlayableRun(window.localStorage); } catch (_) {}
  runtime = createSafariPlayableRuntime();
  logLines = ["新規ランを開始しました。"];
  render();
});

window.addEventListener("pageshow", render);
render();


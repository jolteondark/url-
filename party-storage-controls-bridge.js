import {
  createSafariPlayableRuntime,
  loadSafariPlayableRun,
  saveSafariPlayableRun,
} from "./runtime/safari-playable-integration.js";
import {
  depositSafariPartyPokemon,
  withdrawSafariStoragePokemon,
} from "./runtime/safari-party-storage-actions.js";

const byId = (id) => document.getElementById(id);
let scheduled = false;

function battleActive() {
  const card = byId("battle-card");
  return Boolean(card && !card.hidden);
}

function ensureStyle() {
  if (byId("party-storage-controls-style")) return;
  const style = document.createElement("style");
  style.id = "party-storage-controls-style";
  style.textContent = `
    .party-storage-control-row{display:flex;justify-content:flex-end;gap:6px;margin-top:7px;clear:both}
    .party-storage-control{min-height:32px;border-radius:9px;padding:5px 9px;background:#203751;color:#e4efff;font-size:.68rem;font-weight:750}
    .party-storage-control.withdraw{background:#244936}
    .party-storage-control:disabled{opacity:.42}
    .party-storage-control-message{margin:7px 0 0;color:#a9bad0;font-size:.7rem;min-height:1em}
  `;
  document.head.append(style);
}

function message(text) {
  for (const cardId of ["party-detail-card", "storage-detail-card"]) {
    const card = byId(cardId);
    if (!card) continue;
    let line = card.querySelector(".party-storage-control-message");
    if (!line) {
      line = document.createElement("p");
      line.className = "party-storage-control-message";
      card.append(line);
    }
    line.textContent = text;
  }
}

function loadCurrentRuntime() {
  byId("save-run")?.click();
  const fallback = createSafariPlayableRuntime();
  const loaded = loadSafariPlayableRun(window.localStorage, fallback);
  return loaded.found ? loaded.state : fallback;
}

function commitRuntime(runtime, result) {
  if (!result?.result) return false;
  saveSafariPlayableRun(window.localStorage, runtime);
  byId("continue-run")?.click();
  window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  return true;
}

function rejectionMessage(reason) {
  if (reason === "battle_active") return "戦闘中はParty / Storageを変更できません。";
  if (reason === "last_able") return "最後の戦闘可能ポケモンは預けられません。";
  if (reason === "party_full") return "Partyが6体なので引き出せません。";
  if (reason === "no_destination") return "Storageに空きがありません。";
  return "Party / Storageの変更に失敗しました。";
}

function addPartyControls() {
  const grid = byId("party-detail-grid");
  if (!grid) return;
  const slots = [...grid.querySelectorAll(".party-slot:not(.empty)")];
  slots.forEach((slot, index) => {
    if (slot.querySelector("button[data-storage-deposit-index]")) return;
    const row = document.createElement("div");
    row.className = "party-storage-control-row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "party-storage-control deposit";
    button.dataset.storageDepositIndex = String(index);
    button.disabled = battleActive();
    button.textContent = battleActive() ? "戦闘中" : "Storageへ預ける";
    row.append(button);
    slot.append(row);
  });
}

function storageCoordinates() {
  const fallback = createSafariPlayableRuntime();
  let snapshot = fallback;
  try {
    const loaded = loadSafariPlayableRun(window.localStorage, fallback);
    if (loaded.found) snapshot = loaded.state;
  } catch (_) {}
  const boxes = Array.isArray(snapshot?.storage_system?.boxes) ? snapshot.storage_system.boxes : [];
  const sections = [...document.querySelectorAll("#storage-detail-boxes .storage-box")];
  let sectionIndex = 0;
  boxes.forEach((box, boxIndex) => {
    const slots = Array.isArray(box?.slots) ? box.slots : [];
    const occupiedIndices = slots.map((pokemon, index) => pokemon ? index : -1).filter((index) => index >= 0);
    if (occupiedIndices.length === 0) return;
    const section = sections[sectionIndex++];
    if (!section) return;
    [...section.querySelectorAll(".storage-slot")].forEach((slot, visibleIndex) => {
      slot.dataset.storageBoxIndex = String(boxIndex);
      slot.dataset.storageSlotIndex = String(occupiedIndices[visibleIndex]);
    });
  });
}

function addStorageControls() {
  storageCoordinates();
  document.querySelectorAll("#storage-detail-boxes .storage-slot").forEach((slot) => {
    if (slot.querySelector("button[data-storage-withdraw]")) return;
    const row = document.createElement("div");
    row.className = "party-storage-control-row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "party-storage-control withdraw";
    button.dataset.storageWithdraw = "1";
    button.disabled = battleActive();
    button.textContent = battleActive() ? "戦闘中" : "Partyへ引き出す";
    row.append(button);
    slot.append(row);
  });
}

function renderControls() {
  scheduled = false;
  ensureStyle();
  addPartyControls();
  addStorageControls();
  window.dispatchEvent(new CustomEvent("safari-storage-controls-rendered"));
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(renderControls);
}

document.addEventListener("click", (event) => {
  const deposit = event.target.closest("button[data-storage-deposit-index]");
  if (deposit && !deposit.disabled) {
    const runtime = loadCurrentRuntime();
    const result = depositSafariPartyPokemon(runtime, Number(deposit.dataset.storageDepositIndex));
    if (commitRuntime(runtime, result)) message(result.notice);
    else message(rejectionMessage(result.reason));
    scheduleRender();
    return;
  }

  const withdraw = event.target.closest("button[data-storage-withdraw]");
  if (withdraw && !withdraw.disabled) {
    const slot = withdraw.closest(".storage-slot");
    const runtime = loadCurrentRuntime();
    const result = withdrawSafariStoragePokemon(
      runtime,
      Number(slot?.dataset.storageBoxIndex),
      Number(slot?.dataset.storageSlotIndex),
    );
    if (commitRuntime(runtime, result)) message(result.notice);
    else message(rejectionMessage(result.reason));
    scheduleRender();
  }
});

ensureStyle();
renderControls();
const root = document.querySelector("main.app");
if (root) new MutationObserver(scheduleRender).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
window.addEventListener("pageshow", scheduleRender);
window.addEventListener("storage", scheduleRender);
window.addEventListener("safari-runtime-changed", scheduleRender);

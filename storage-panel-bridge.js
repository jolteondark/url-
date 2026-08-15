import {
  createSafariPlayableRuntime,
  loadSafariPlayableRun,
} from "./runtime/safari-playable-integration.js";

const byId = (id) => document.getElementById(id);
let scheduled = false;

function ensurePanel() {
  let card = byId("storage-detail-card");
  if (card) return card;
  card = document.createElement("section");
  card.className = "card storage-detail-card";
  card.id = "storage-detail-card";
  card.innerHTML = `
    <div class="section-heading">
      <h2>Storage</h2>
      <span class="pill" id="storage-detail-count">0</span>
    </div>
    <div class="storage-detail-boxes" id="storage-detail-boxes" aria-live="polite"></div>
  `;
  const partyCard = byId("party-detail-card");
  const saveActions = document.querySelector(".save-actions");
  if (partyCard) partyCard.insertAdjacentElement("afterend", card);
  else if (saveActions) saveActions.insertAdjacentElement("afterend", card);
  else document.querySelector("main.app")?.prepend(card);
  return card;
}

function ensureStyle() {
  if (byId("storage-panel-bridge-style")) return;
  const style = document.createElement("style");
  style.id = "storage-panel-bridge-style";
  style.textContent = `
    .storage-detail-boxes{display:grid;gap:10px}
    .storage-empty{display:grid;place-items:center;min-height:76px;border:1px dashed #31445f;border-radius:14px;background:#0d1521;color:#7f91a9}
    .storage-box{border:1px solid #31445f;border-radius:15px;background:#0f1927;padding:10px}
    .storage-box-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px}
    .storage-box-head strong{font-size:.86rem}.storage-box-head span{color:#879ab4;font-size:.7rem}
    .storage-box-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .storage-slot{min-width:0;border:1px solid #26374d;border-radius:12px;background:#131f30;padding:9px}
    .storage-slot-head{display:flex;align-items:baseline;justify-content:space-between;gap:7px}
    .storage-slot-head strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem}
    .storage-slot-head span,.storage-slot-meta{color:#a9bad0;font-size:.67rem}
    .storage-slot-meta{display:flex;justify-content:space-between;gap:7px;margin-top:5px}
    .storage-slot .hp-track{height:6px;margin:5px 0 6px}
    .storage-slot-status{color:#91a7c5;font-size:.65rem}
    .storage-slot-moves{display:grid;gap:2px;margin:6px 0 0;padding:0;list-style:none}
    .storage-slot-moves li{display:flex;justify-content:space-between;gap:6px;color:#c6d4e7;font-size:.63rem;line-height:1.3}
    .storage-slot-moves li span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .storage-slot-moves li span:last-child{flex:0 0 auto;color:#7f91a9}
    @media(max-width:520px){.storage-box-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function loadRuntimeSnapshot() {
  const fallback = createSafariPlayableRuntime();
  try {
    const loaded = loadSafariPlayableRun(window.localStorage, fallback);
    return loaded.found ? loaded.state : fallback;
  } catch (_) {
    return fallback;
  }
}

function normalizedMove(move) {
  if (typeof move === "string") return { id: move, pp: null };
  return { id: move?.id ?? move?.move ?? "-", pp: Number.isFinite(Number(move?.pp)) ? Number(move.pp) : null };
}

function pokemonCard(pokemon, slotIndex) {
  const article = document.createElement("article");
  article.className = "storage-slot";
  const hp = Math.max(0, Number(pokemon?.hp ?? 0));
  const maxHp = Math.max(1, Number(pokemon?.max_hp ?? pokemon?.maxHp ?? 1));
  const hpPercent = Math.max(0, Math.min(100, hp / maxHp * 100));
  const status = pokemon?.status && pokemon.status !== "NONE" ? pokemon.status : "正常";
  const moves = Array.isArray(pokemon?.moves) ? pokemon.moves.slice(0, 4).map(normalizedMove) : [];

  const head = document.createElement("div");
  head.className = "storage-slot-head";
  const name = document.createElement("strong");
  name.textContent = `${slotIndex + 1}. ${pokemon?.species ?? "UNKNOWN"}`;
  const level = document.createElement("span");
  level.textContent = `Lv.${Number(pokemon?.level ?? 1)}`;
  head.append(name, level);

  const meta = document.createElement("div");
  meta.className = "storage-slot-meta";
  meta.innerHTML = `<span>HP</span><span>${hp} / ${maxHp}</span>`;
  const track = document.createElement("div");
  track.className = "hp-track";
  const fill = document.createElement("span");
  fill.style.width = `${hpPercent}%`;
  track.append(fill);

  const statusLine = document.createElement("div");
  statusLine.className = "storage-slot-status";
  statusLine.textContent = `状態: ${status}`;

  const moveList = document.createElement("ul");
  moveList.className = "storage-slot-moves";
  for (const move of moves) {
    const item = document.createElement("li");
    const moveName = document.createElement("span");
    moveName.textContent = move.id;
    const pp = document.createElement("span");
    pp.textContent = move.pp === null ? "" : `PP ${move.pp}`;
    item.append(moveName, pp);
    moveList.append(item);
  }
  if (moves.length === 0) {
    const item = document.createElement("li");
    item.textContent = "技データなし";
    moveList.append(item);
  }

  article.append(head, meta, track, statusLine, moveList);
  return article;
}

function boxCard(box, boxIndex) {
  const slots = Array.isArray(box?.slots) ? box.slots : [];
  const occupied = slots.map((pokemon, slotIndex) => ({ pokemon, slotIndex })).filter(({ pokemon }) => Boolean(pokemon));
  if (occupied.length === 0) return null;
  const section = document.createElement("section");
  section.className = "storage-box";
  const head = document.createElement("div");
  head.className = "storage-box-head";
  const title = document.createElement("strong");
  title.textContent = box?.name ?? `Box ${boxIndex + 1}`;
  const count = document.createElement("span");
  count.textContent = `${occupied.length}体`;
  head.append(title, count);
  const grid = document.createElement("div");
  grid.className = "storage-box-grid";
  grid.replaceChildren(...occupied.map(({ pokemon, slotIndex }) => pokemonCard(pokemon, slotIndex)));
  section.append(head, grid);
  return section;
}

function renderStoragePanel() {
  scheduled = false;
  ensurePanel();
  ensureStyle();
  const snapshot = loadRuntimeSnapshot();
  const boxes = Array.isArray(snapshot?.storage_system?.boxes) ? snapshot.storage_system.boxes : [];
  const cards = boxes.map(boxCard).filter(Boolean);
  const total = boxes.reduce((sum, box) => sum + (Array.isArray(box?.slots) ? box.slots.filter(Boolean).length : 0), 0);
  byId("storage-detail-count").textContent = `${total}体`;
  const root = byId("storage-detail-boxes");
  if (cards.length > 0) root.replaceChildren(...cards);
  else {
    const empty = document.createElement("div");
    empty.className = "storage-empty";
    empty.textContent = "Storageは空です";
    root.replaceChildren(empty);
  }
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(renderStoragePanel);
}

ensurePanel();
ensureStyle();
renderStoragePanel();

for (const id of ["storage", "party", "log"]) {
  const node = byId(id);
  if (node) new MutationObserver(scheduleRender).observe(node, { subtree: true, childList: true, characterData: true });
}
window.addEventListener("pageshow", scheduleRender);
window.addEventListener("storage", scheduleRender);

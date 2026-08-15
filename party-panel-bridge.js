import {
  createSafariPlayableRuntime,
  loadSafariPlayableRun,
} from "./runtime/safari-playable-integration.js";

const byId = (id) => document.getElementById(id);
let scheduled = false;

function ensurePanel() {
  let card = byId("party-detail-card");
  if (card) return card;
  card = document.createElement("section");
  card.className = "card party-detail-card";
  card.id = "party-detail-card";
  card.innerHTML = `
    <div class="section-heading">
      <h2>Party</h2>
      <span class="pill" id="party-detail-count">0 / 6</span>
    </div>
    <div class="party-detail-grid" id="party-detail-grid" aria-live="polite"></div>
  `;
  const saveActions = document.querySelector(".save-actions");
  if (saveActions) saveActions.insertAdjacentElement("afterend", card);
  else document.querySelector("main.app")?.prepend(card);
  return card;
}

function ensureStyle() {
  if (byId("party-panel-bridge-style")) return;
  const style = document.createElement("style");
  style.id = "party-panel-bridge-style";
  style.textContent = `
    .party-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .party-slot{min-width:0;border:1px solid #31445f;border-radius:14px;background:#111c2b;padding:11px}
    .party-slot.empty{display:grid;place-items:center;min-height:92px;color:#667991;border-style:dashed;background:#0d1521}
    .party-slot-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
    .party-slot-head strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem}
    .party-slot-head span,.party-slot-hp,.party-slot-status{color:#a9bad0;font-size:.72rem}
    .party-slot-hp{display:flex;justify-content:space-between;gap:8px;margin-top:7px}
    .party-slot .hp-track{height:7px;margin:5px 0 7px}
    .party-moves{display:grid;gap:3px;margin:0;padding:0;list-style:none}
    .party-moves li{display:flex;justify-content:space-between;gap:7px;color:#c9d7ea;font-size:.68rem;line-height:1.35}
    .party-moves li span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .party-moves li span:last-child{flex:0 0 auto;color:#879ab4}
    @media(max-width:520px){.party-detail-grid{grid-template-columns:1fr}}
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

function liveLeadSnapshot(pokemon) {
  const battleCard = byId("battle-card");
  if (!pokemon || !battleCard || battleCard.hidden) return pokemon;
  const species = byId("player-name")?.textContent?.trim();
  const levelText = byId("player-level")?.textContent ?? "";
  const hpText = byId("player-hp")?.textContent ?? "";
  const hpMatch = hpText.match(/(\d+)\s*\/\s*(\d+)/);
  const levelMatch = levelText.match(/(\d+)/);
  if (!species || species !== pokemon.species) return pokemon;
  return {
    ...pokemon,
    level: levelMatch ? Number(levelMatch[1]) : pokemon.level,
    hp: hpMatch ? Number(hpMatch[1]) : pokemon.hp,
    max_hp: hpMatch ? Number(hpMatch[2]) : pokemon.max_hp,
  };
}

function pokemonSlot(pokemon, index) {
  const article = document.createElement("article");
  article.className = "party-slot";
  if (!pokemon) {
    article.classList.add("empty");
    article.textContent = `${index + 1}. EMPTY`;
    return article;
  }

  const hp = Math.max(0, Number(pokemon.hp ?? 0));
  const maxHp = Math.max(1, Number(pokemon.max_hp ?? pokemon.maxHp ?? 1));
  const hpPercent = Math.max(0, Math.min(100, hp / maxHp * 100));
  const status = pokemon.status && pokemon.status !== "NONE" ? pokemon.status : "正常";
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves.slice(0, 4).map(normalizedMove) : [];

  const head = document.createElement("div");
  head.className = "party-slot-head";
  const name = document.createElement("strong");
  name.textContent = `${index + 1}. ${pokemon.species ?? "UNKNOWN"}`;
  const level = document.createElement("span");
  level.textContent = `Lv.${Number(pokemon.level ?? 1)}`;
  head.append(name, level);

  const hpMeta = document.createElement("div");
  hpMeta.className = "party-slot-hp";
  hpMeta.innerHTML = `<span>HP</span><span>${hp} / ${maxHp}</span>`;
  const track = document.createElement("div");
  track.className = "hp-track";
  const fill = document.createElement("span");
  fill.style.width = `${hpPercent}%`;
  track.append(fill);

  const statusLine = document.createElement("div");
  statusLine.className = "party-slot-status";
  statusLine.textContent = `状態: ${status}`;

  const moveList = document.createElement("ul");
  moveList.className = "party-moves";
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

  article.append(head, hpMeta, track, statusLine, moveList);
  return article;
}

function renderPartyPanel() {
  scheduled = false;
  ensurePanel();
  ensureStyle();
  const snapshot = loadRuntimeSnapshot();
  const party = Array.isArray(snapshot?.player?.party) ? [...snapshot.player.party] : [];
  if (party.length > 0) party[0] = liveLeadSnapshot(party[0]);
  byId("party-detail-count").textContent = `${party.length} / 6`;
  const slots = Array.from({ length: 6 }, (_, index) => pokemonSlot(party[index] ?? null, index));
  byId("party-detail-grid").replaceChildren(...slots);
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(renderPartyPanel);
}

ensurePanel();
ensureStyle();
renderPartyPanel();

for (const id of ["party", "battle-card", "player-name", "player-level", "player-hp", "log"]) {
  const node = byId(id);
  if (node) new MutationObserver(scheduleRender).observe(node, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
}
window.addEventListener("pageshow", scheduleRender);
window.addEventListener("storage", scheduleRender);

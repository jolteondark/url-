import { resolveSafariCanonicalHpZone } from "./runtime/safari-canonical-hp-zone.js";

const battleCard = document.getElementById("battle-card");
const STATUS_LABELS = Object.freeze({
  SLEEP: "SLP",
  ASLEEP: "SLP",
  POISON: "PSN",
  POISONED: "PSN",
  TOXIC: "PSN",
  BURN: "BRN",
  BURNED: "BRN",
  PARALYSIS: "PAR",
  PARALYZED: "PAR",
  FROZEN: "FRZ",
  FREEZE: "FRZ",
});
let scheduled = false;

function runtimeState() {
  return globalThis.__maplessSafariRuntime ?? null;
}

function setTextIfChanged(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setHiddenIfChanged(node, hidden) {
  if (node && node.hidden !== hidden) node.hidden = hidden;
}

function setDatasetIfChanged(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

function setAttributeIfChanged(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function statusLabel(value) {
  const key = String(value ?? "").trim().toUpperCase();
  if (!key || key === "NONE" || key === "OK") return "";
  return STATUS_LABELS[key] ?? key.slice(0, 3);
}

function canonicalGender(value) {
  if (value === 0) return "male";
  if (value === 1) return "female";
  const key = String(value ?? "").trim().toUpperCase();
  if (key === "M" || key === "MALE" || key === "♂") return "male";
  if (key === "F" || key === "FEMALE" || key === "♀") return "female";
  return "";
}

function ensureBadge(panel) {
  if (!panel) return null;
  let badge = panel.querySelector(":scope > .canonical-status-badge");
  if (badge) return badge;
  badge = document.createElement("span");
  badge.className = "canonical-status-badge";
  badge.hidden = true;
  badge.setAttribute("aria-label", "状態異常");
  panel.append(badge);
  return badge;
}

function ensureGender(panel) {
  if (!panel) return null;
  let gender = panel.querySelector(":scope > .canonical-gender");
  if (gender) return gender;
  gender = document.createElement("span");
  gender.className = "canonical-gender";
  gender.hidden = true;
  panel.append(gender);
  return gender;
}

function maxHp(pokemon) {
  return pokemon?.max_hp ?? pokemon?.totalhp ?? pokemon?.maxHp ?? pokemon?.hp ?? 1;
}

function syncLevel(panel, pokemon) {
  const levelNode = panel?.querySelector(".pokemon-name > span");
  const rawLevel = Number(pokemon?.level ?? pokemon?.lvl);
  if (!levelNode || !Number.isFinite(rawLevel)) return;
  const level = Math.max(1, Math.trunc(rawLevel));
  levelNode.classList.add("canonical-level-value");
  setTextIfChanged(levelNode, String(level));
  setAttributeIfChanged(levelNode, "aria-label", `Lv.${level}`);
}

function syncPanel(panel, pokemon) {
  if (!panel) return;
  const badge = ensureBadge(panel);
  const genderNode = ensureGender(panel);
  const status = pokemon?.status;
  const label = statusLabel(status);
  if (badge) {
    setTextIfChanged(badge, label);
    setDatasetIfChanged(badge, "status", String(status ?? "NONE").toUpperCase());
    setHiddenIfChanged(badge, !label);
  }
  if (genderNode) {
    const gender = canonicalGender(pokemon?.gender ?? pokemon?.sex);
    const genderText = gender === "male" ? "♂" : gender === "female" ? "♀" : "";
    const genderLabel = gender === "male" ? "オス" : gender === "female" ? "メス" : "";
    setDatasetIfChanged(genderNode, "gender", gender);
    setTextIfChanged(genderNode, genderText);
    setAttributeIfChanged(genderNode, "aria-label", genderLabel);
    setHiddenIfChanged(genderNode, !gender);
  }
  syncLevel(panel, pokemon);
  setDatasetIfChanged(panel, "hpZone", String(resolveSafariCanonicalHpZone({
    hp: pokemon?.hp,
    maxHp: maxHp(pokemon),
  })));
}

function syncDataboxState() {
  if (!battleCard || battleCard.hidden) return;
  const runtime = runtimeState();
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  const player = runtime?.player?.party?.[0] ?? battle?.player ?? null;
  const foe = battle?.foe ?? null;
  syncPanel(document.querySelector("#battle-card .player-info"), player);
  syncPanel(document.querySelector("#battle-card .foe-info"), foe);
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    syncDataboxState();
  });
}

if (battleCard) syncDataboxState();
window.addEventListener("pageshow", scheduleSync, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive: true });

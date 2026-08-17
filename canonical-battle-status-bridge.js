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

function statusLabel(value) {
  const key = String(value ?? "").trim().toUpperCase();
  if (!key || key === "NONE" || key === "OK") return "";
  return STATUS_LABELS[key] ?? key.slice(0, 3);
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

function syncStatus() {
  if (!battleCard || battleCard.hidden) return;
  const runtime = runtimeState();
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  const player = runtime?.player?.party?.[0] ?? battle?.player ?? null;
  const foe = battle?.foe ?? null;
  const pairs = [
    [document.querySelector("#battle-card .player-info"), player?.status],
    [document.querySelector("#battle-card .foe-info"), foe?.status],
  ];
  for (const [panel, status] of pairs) {
    const badge = ensureBadge(panel);
    if (!badge) continue;
    const label = statusLabel(status);
    badge.textContent = label;
    badge.dataset.status = String(status ?? "NONE").toUpperCase();
    badge.hidden = !label;
  }
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    syncStatus();
  });
}

if (battleCard) {
  new MutationObserver(scheduleSync).observe(battleCard, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  battleCard.addEventListener("pointerdown", scheduleSync, { passive: true });
  battleCard.addEventListener("click", scheduleSync, { passive: true });
  syncStatus();
}

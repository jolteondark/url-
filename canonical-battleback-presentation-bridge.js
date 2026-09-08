import { canonicalBattlebackPublishedPath } from "./runtime/canonical-battleback-sources.js?v=20260901-2300";

const PERIOD_PREFIX = Object.freeze({
  day: "field",
  eve: "field_eve",
  night: "field_night",
});
let lastMissingSignature = "";

function maplessState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function normalizePeriod(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text.includes("night")) return "night";
  if (text.includes("eve") || text.includes("evening") || text.includes("dusk")) return "eve";
  if (text.includes("day") || text.includes("morning") || text.includes("noon")) return "day";
  return null;
}

function battlePeriod(state = maplessState()) {
  const battle = state?.battle ?? null;
  return normalizePeriod(
    battle?.timeOfDay ?? battle?.time_of_day ?? battle?.period ??
    state?.timeOfDay ?? state?.time_of_day ?? state?.period
  );
}

export function canonicalBattlebackNamesForPeriod(period) {
  const normalized = normalizePeriod(period);
  if (!normalized) return null;
  const prefix = PERIOD_PREFIX[normalized];
  return Object.freeze({
    bg: `${prefix}_bg.png`,
    playerBase: `${prefix}_base0.png`,
    foeBase: `${prefix}_base1.png`,
    message: "field_message.png",
  });
}

function setOwnedBackground(element, path, owner) {
  if (!element) return;
  if (path) {
    element.style.backgroundImage = `url("${path}")`;
    element.style.backgroundRepeat = "no-repeat";
    element.style.backgroundPosition = "center";
    element.style.backgroundSize = "contain";
    element.dataset.canonicalBattlebackOwner = owner;
    element.dataset.canonicalBattlebackPath = path;
    return;
  }
  element.style.backgroundImage = "none";
  element.style.removeProperty("background-repeat");
  element.style.removeProperty("background-position");
  element.style.removeProperty("background-size");
  element.dataset.canonicalBattlebackOwner = owner;
  delete element.dataset.canonicalBattlebackPath;
}

function releaseOwnedBackground(element) {
  if (!element?.dataset?.canonicalBattlebackOwner) return;
  element.style.removeProperty("background-image");
  element.style.removeProperty("background-repeat");
  element.style.removeProperty("background-position");
  element.style.removeProperty("background-size");
  delete element.dataset.canonicalBattlebackOwner;
  delete element.dataset.canonicalBattlebackPath;
}

function suppressSceneFallback(card, suppress) {
  if (suppress) {
    card.style.backgroundImage = "none";
    card.dataset.canonicalBattlebackSceneFallback = "suppressed";
    return;
  }
  if (card.dataset.canonicalBattlebackSceneFallback !== "suppressed") return;
  card.style.removeProperty("background-image");
  delete card.dataset.canonicalBattlebackSceneFallback;
}

function reportMissingPeriod(card) {
  card.dataset.canonicalBattlebackPeriod = "unresolved";
  card.dataset.canonicalBattlebackMissing = "owner-period";
  const signature = "unresolved:owner-period";
  if (signature === lastMissingSignature) return;
  lastMissingSignature = signature;

  const detail = Object.freeze({ period: null, reason: "missing-owner-period" });
  globalThis.__maplessBattlebackPresentationDiagnostic = detail;
  console.warn("[Mapless] canonical battleback period unresolved; keeping scene fallback until owner supplies day/eve/night");
  window.dispatchEvent(new CustomEvent("mapless-canonical-battleback-period-unresolved", { detail }));
}

function reportMissingBattlebacks(card, period, names, resolved) {
  const missing = [
    ["bg", names.bg, resolved.bg],
    ["playerBase", names.playerBase, resolved.playerBase],
    ["foeBase", names.foeBase, resolved.foeBase],
  ].filter(([, , path]) => !path).map(([slot, name]) => Object.freeze({ slot, name }));

  if (missing.length === 0) {
    delete card.dataset.canonicalBattlebackMissing;
    lastMissingSignature = "";
    return;
  }

  card.dataset.canonicalBattlebackMissing = missing.map(({ name }) => name).join(",");
  const signature = `${period}:${card.dataset.canonicalBattlebackMissing}`;
  if (signature === lastMissingSignature) return;
  lastMissingSignature = signature;

  const detail = Object.freeze({ period, missing: Object.freeze(missing) });
  globalThis.__maplessBattlebackPresentationDiagnostic = detail;
  console.warn(`[Mapless] canonical battleback assets unpublished (${period}): ${missing.map(({ name }) => name).join(", ")}`);
  window.dispatchEvent(new CustomEvent("mapless-canonical-battleback-missing", { detail }));
}

export function applyCanonicalBattlebackPresentation() {
  const card = document.getElementById("battle-card");
  if (!card) return;
  const period = battlePeriod();
  if (!period) {
    delete card.dataset.canonicalBattlebackBg;
    delete card.dataset.canonicalBattlebackPlayerBase;
    delete card.dataset.canonicalBattlebackFoeBase;
    suppressSceneFallback(card, false);
    releaseOwnedBackground(card.querySelector(".arena"));
    releaseOwnedBackground(card.querySelector(".player-platform"));
    releaseOwnedBackground(card.querySelector(".foe-platform"));
    reportMissingPeriod(card);
    return;
  }

  const names = canonicalBattlebackNamesForPeriod(period);
  const bg = canonicalBattlebackPublishedPath(names.bg);
  const playerBase = canonicalBattlebackPublishedPath(names.playerBase);
  const foeBase = canonicalBattlebackPublishedPath(names.foeBase);

  card.dataset.canonicalBattlebackPeriod = period;
  card.dataset.canonicalBattlebackBg = bg ? "published" : "missing";
  card.dataset.canonicalBattlebackPlayerBase = playerBase ? "published" : "missing";
  card.dataset.canonicalBattlebackFoeBase = foeBase ? "published" : "missing";
  reportMissingBattlebacks(card, period, names, { bg, playerBase, foeBase });
  suppressSceneFallback(card, !bg);

  setOwnedBackground(card.querySelector(".arena"), bg, "bg");
  setOwnedBackground(card.querySelector(".player-platform"), playerBase, "player-base");
  setOwnedBackground(card.querySelector(".foe-platform"), foeBase, "foe-base");
}

let scheduled = false;
function scheduleApply() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyCanonicalBattlebackPresentation();
  });
}

window.addEventListener("pageshow", scheduleApply, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleApply, { passive: true });
window.addEventListener("safari-battle-presentation-event", scheduleApply, { passive: true });
scheduleApply();

globalThis.__maplessApplyCanonicalBattlebackPresentation = applyCanonicalBattlebackPresentation;

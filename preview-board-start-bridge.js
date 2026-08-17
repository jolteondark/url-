import {
  activateSafariDayBoardCell,
} from "./runtime/safari-playable-integration.js";
import {
  ensureSafariGeneralCombatData,
  ensureSafariGeneralData,
  safariGeneralCombatReady,
  safariGeneralDataReady,
} from "./runtime/safari-general-data-demand.js";

function stateOf(runtime) {
  return runtime?.variables?.mapless ?? null;
}

function dataModeFor(state, index) {
  const event = state?.board_events?.[index];
  if (event?.kind === "wild" || event?.kind === "trainer") return "combat";
  if (event?.kind === "normal_event" && event.normal_event_id === "wounded_pokemon") return "masters";
  return null;
}

async function ensureChoiceData(state, index) {
  const mode = dataModeFor(state, index);
  if (mode === "combat" && !safariGeneralCombatReady()) {
    await ensureSafariGeneralCombatData();
  } else if (mode === "masters" && !safariGeneralDataReady()) {
    await ensureSafariGeneralData();
  }
}

window.addEventListener("safari-preview-start", async (event) => {
  const index = Number(event.detail?.boardIndex);
  if (!Number.isInteger(index) || index < 0 || index > 7) return;

  const runtime = globalThis.__maplessSafariRuntime;
  const state = stateOf(runtime);
  if (!state) return;

  const notice = document.getElementById("notice");
  if (notice) notice.textContent = "選択したマスを準備しています…";

  try {
    await ensureChoiceData(state, index);
    activateSafariDayBoardCell(runtime, index);
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
    const target = state.battle
      ? document.getElementById("battle-card")
      : state.shop
        ? document.getElementById("shop-card")
        : null;
    if (target) window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  } catch (error) {
    if (notice) notice.textContent = "マスの読み込みに失敗しました。";
    console.error("[Mapless] first board choice failed", error);
  }
});

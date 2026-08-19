import {
  listSafariCarryoverCandidates,
  prepareSafariNextRun,
  saveSafariPlayableRun,
} from "./runtime/safari-web-playable-integration.js";

const byId = (id) => document.getElementById(id);
let rendering = false;
let selecting = false;

function stateOfRuntime() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function removePanel() {
  byId("carryover-next-run-panel")?.remove();
}

function exactStateSnapshot(state) {
  if (!state || typeof state !== "object") return state ?? null;
  return typeof structuredClone === "function" ? structuredClone(state) : { ...state };
}

function rememberExactError(error, state) {
  const exact = error instanceof Error ? error : new Error(String(error));
  exact.state = exactStateSnapshot(state);
  globalThis.__maplessLastError = exact;
  return exact;
}

function rememberPresentationError(message, state) {
  const error = new Error(message);
  error.name = "CarryoverPresentationError";
  return rememberExactError(error, state);
}

function ensurePanel(state) {
  const boardCard = byId("board-card");
  if (!boardCard) {
    rememberPresentationError("carryover presentation board-card is unavailable", state);
    return null;
  }
  let panel = byId("carryover-next-run-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "carryover-next-run-panel";
    panel.className = "carryover-next-run-panel";
    boardCard.append(panel);
  }
  return panel;
}

function focusCarryoverChoice(panel) {
  const state = stateOfRuntime();
  if (!state?.mapless_carryover_pending || state.location !== "home" || !panel?.isConnected) return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && active.getClientRects().length > 0) return;
  const target = panel.querySelector("button:not(:disabled)");
  if (!(target instanceof HTMLElement)) return;
  panel.scrollIntoView?.({ behavior:"smooth", block:"center", inline:"nearest" });
  target.focus({ preventScroll:true });
}

function disableCarryoverChoices(panel = byId("carryover-next-run-panel")) {
  if (!panel) return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && panel.contains(active)) active.blur();
  for (const button of panel.querySelectorAll("button")) button.disabled = true;
}

function fallbackButton() {
  const fallback = document.createElement("button");
  fallback.type = "button";
  fallback.dataset.carryoverFallback = "true";
  fallback.disabled = selecting;
  fallback.textContent = "通常スターターで始める";
  return fallback;
}

function candidateButton(candidate) {
  const pokemon = candidate.pokemon ?? {};
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.carryoverBox = String(candidate.boxIndex);
  button.dataset.carryoverSlot = String(candidate.slotIndex);
  button.disabled = selecting;
  const name = document.createElement("strong");
  name.textContent = pokemon.species ?? "Pokemon";
  const meta = document.createElement("small");
  meta.textContent = `Lv.${Number(pokemon.level ?? 0)} / ${candidate.carryClass}`;
  button.append(name, meta);
  return button;
}

export async function renderSafariCarryoverSelection() {
  if (rendering) return;
  const state = stateOfRuntime();
  if (!state?.mapless_carryover_pending || state.location !== "home") {
    removePanel();
    return;
  }
  const panel = ensurePanel(state);
  if (!panel) return;
  rendering = true;
  const heading = document.createElement("strong");
  heading.textContent = "次のランへ持ち込むポケモンを選んでください";
  try {
    const candidates = await listSafariCarryoverCandidates(globalThis.__maplessSafariRuntime);
    const options = document.createElement("div");
    options.className = "carryover-next-run-options";
    options.replaceChildren(...candidates.map(candidateButton));
    panel.replaceChildren(heading, options, fallbackButton());
  } catch (error) {
    rememberExactError(error, state);
    const message = document.createElement("p");
    message.textContent = "持ち越し候補を読み込めませんでした。通常スターターなら次のランを開始できます。";
    panel.replaceChildren(heading, message, fallbackButton());
  } finally {
    rendering = false;
    requestAnimationFrame(() => focusCarryoverChoice(panel));
  }
}

function renderAfterPreviewRestore() {
  queueMicrotask(() => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => void renderSafariCarryoverSelection());
    } else {
      void renderSafariCarryoverSelection();
    }
  });
}

async function choose(selection) {
  if (selecting) return;
  selecting = true;
  disableCarryoverChoices();
  try {
    const runtime = globalThis.__maplessSafariRuntime;
    const result = await prepareSafariNextRun(runtime, selection);
    if (result?.result !== "prepared") return;
    if (result.operations?.some((operation) => operation.op === "request_save")) {
      saveSafariPlayableRun(window.localStorage, runtime);
    }
    removePanel();
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } catch (error) {
    rememberExactError(error, stateOfRuntime());
  } finally {
    selecting = false;
    queueMicrotask(renderSafariCarryoverSelection);
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-carryover-box][data-carryover-slot],button[data-carryover-fallback]");
  if (!button) return;
  event.preventDefault();
  if (button.dataset.carryoverFallback === "true") {
    void choose(null);
    return;
  }
  void choose({
    boxIndex: Number(button.dataset.carryoverBox),
    slotIndex: Number(button.dataset.carryoverSlot),
  });
});

window.addEventListener("safari-preview-start", renderAfterPreviewRestore);
window.addEventListener("safari-runtime-changed", () => queueMicrotask(renderSafariCarryoverSelection));
window.addEventListener("pageshow", () => queueMicrotask(renderSafariCarryoverSelection));
queueMicrotask(renderSafariCarryoverSelection);

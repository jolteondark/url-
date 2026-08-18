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

function ensurePanel() {
  const boardCard = byId("board-card");
  if (!boardCard) return null;
  let panel = byId("carryover-next-run-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "carryover-next-run-panel";
    panel.className = "carryover-next-run-panel";
    boardCard.append(panel);
  }
  return panel;
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
  const panel = ensurePanel();
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
    globalThis.__maplessLastError = error;
    const message = document.createElement("p");
    message.textContent = "持ち越し候補を読み込めませんでした。通常スターターなら次のランを開始できます。";
    panel.replaceChildren(heading, message, fallbackButton());
  } finally {
    rendering = false;
  }
}

async function choose(selection) {
  if (selecting) return;
  selecting = true;
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
    globalThis.__maplessLastError = error;
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

window.addEventListener("safari-runtime-changed", () => queueMicrotask(renderSafariCarryoverSelection));
window.addEventListener("safari-preview-start", () => window.requestAnimationFrame(() => void renderSafariCarryoverSelection()));
window.addEventListener("pageshow", () => queueMicrotask(renderSafariCarryoverSelection));
queueMicrotask(renderSafariCarryoverSelection);

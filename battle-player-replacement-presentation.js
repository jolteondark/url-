import { resolveSafariBoundaryPlayerReplacement } from "./runtime/safari-playable-integration.js";
import {
  captureSafariBattlePresentationAckSequence,
  completeSafariBattlePresentationForSequence,
} from "./runtime/safari-battle-presentation-ack.js";
import { captureSafariBattleReplacementCommit } from "./runtime/safari-battle-orchestrator.js";
import { replaceSafariBattlePlayer } from "./runtime/safari-web-playable-integration.js";

const REPLACEMENT_PHASE = "REPLACEMENT";
const byId = (id) => document.getElementById(id);
const replacementCommitTokens = new WeakMap();
let replacementSelecting = false;

function battleState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function replacementActive(battle = battleState()) {
  return battle?.phase === REPLACEMENT_PHASE && battle?.presentation_checkpoint?.committed !== false;
}

function replacementOptions(battle = battleState()) {
  if (!replacementActive(battle)) return [];
  const stored = Array.isArray(battle?.player_replacement_options)
    ? battle.player_replacement_options
    : [];
  if (stored.length > 0 || battle?.origin !== "boundary_trial") return stored;

  const runtime = globalThis.__maplessSafariRuntime;
  const pending = resolveSafariBoundaryPlayerReplacement(runtime);
  return (pending?.playerReplacementContinuation?.replacementOptions ?? [])
    .filter((option) => option?.canSwitchIn)
    .map((option) => ({ partyIndex: Number(option.partyIndex), pokemon: structuredClone(option.pokemon) }));
}

function clearReplacementUi() {
  const panel = byId("player-replacement-panel");
  const active = document.activeElement;
  if (panel && active instanceof HTMLElement && panel.contains(active)) active.blur();
  panel?.remove();
  const card = byId("battle-card");
  if (card) delete card.dataset.playerReplacementRequired;
}

function replacementButton(option, replacementCommitToken) {
  const pokemon = option?.pokemon ?? {};
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.playerReplacementPartyIndex = String(option.partyIndex);
  button.disabled = replacementSelecting || !replacementActive();
  replacementCommitTokens.set(button, replacementCommitToken);

  const name = document.createElement("strong");
  name.textContent = pokemon.nickname ?? pokemon.species ?? `Party ${Number(option.partyIndex) + 1}`;
  const meta = document.createElement("small");
  meta.textContent = `Lv.${Number(pokemon.level ?? 0)} / HP ${Number(pokemon.hp ?? 0)} / ${Number(pokemon.max_hp ?? 0)}`;
  button.append(name, meta);
  return button;
}

function syncReplacementUi() {
  const battle = battleState();
  if (!replacementActive(battle)) {
    replacementSelecting = false;
    clearReplacementUi();
    return;
  }

  const options = replacementOptions(battle);
  const card = byId("battle-card");
  const moves = byId("moves");
  if (!card || !moves) return;
  const replacementCommitToken = captureSafariBattleReplacementCommit(globalThis.__maplessSafariRuntime, "player");

  card.dataset.playerReplacementRequired = "true";

  let panel = byId("player-replacement-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "player-replacement-panel";
    panel.className = "player-replacement-panel";
    panel.setAttribute("aria-label", "交代するポケモン");
    moves.before(panel);
  }

  const heading = document.createElement("strong");
  heading.className = "player-replacement-heading";
  heading.textContent = "次のポケモンを選んでください";
  const grid = document.createElement("div");
  grid.className = "move-grid player-replacement-options";
  grid.replaceChildren(...options.map((option) => replacementButton(option, replacementCommitToken)));
  panel.replaceChildren(heading, grid);
  globalThis.__maplessApplyBattlePhaseUi?.();
}

async function chooseReplacement(button) {
  if (replacementSelecting || !replacementActive()) return;
  const battle = battleState();
  const partyIndex = Number(button.dataset.playerReplacementPartyIndex);
  const legal = replacementOptions(battle)
    .some((option) => Number(option?.partyIndex) === partyIndex);
  if (!legal) return;
  const replacementCommitToken = replacementCommitTokens.get(button);
  if (!replacementCommitToken) return;

  replacementSelecting = true;
  if (button instanceof HTMLElement) {
    button.blur();
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }
  syncReplacementUi();
  try {
    const runtime = globalThis.__maplessSafariRuntime;
    if (battle?.origin === "boundary_trial") {
      resolveSafariBoundaryPlayerReplacement(runtime, partyIndex, { replacementCommitToken });
    } else {
      await replaceSafariBattlePlayer(runtime, partyIndex, { replacementCommitToken });
    }
    const presentationSequence = captureSafariBattlePresentationAckSequence(runtime);
    const phaseBeforeAck = battleState()?.phase ?? null;
    const phaseAfterAck = completeSafariBattlePresentationForSequence(runtime, presentationSequence);
    if (phaseAfterAck !== phaseBeforeAck) {
      window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
    }
  } catch (error) {
    globalThis.__maplessLastError = error;
  } finally {
    replacementSelecting = false;
    queueMicrotask(syncReplacementUi);
  }
}

byId("battle-card")?.addEventListener("click", (event) => {
  const replacement = event.target.closest("button[data-player-replacement-party-index]");
  if (!replacement || replacementSelecting || replacement.disabled || !replacementActive()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void chooseReplacement(replacement);
}, true);

window.addEventListener("safari-runtime-changed", () => queueMicrotask(syncReplacementUi));
window.addEventListener("pageshow", () => queueMicrotask(syncReplacementUi));
queueMicrotask(syncReplacementUi);
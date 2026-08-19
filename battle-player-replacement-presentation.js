import { replaceSafariBattlePlayer } from "./runtime/safari-web-playable-integration.js";
import { SAFARI_BATTLE_PHASE } from "./runtime/safari-battle-orchestrator.js";

const byId = (id) => document.getElementById(id);
let selecting = false;

function battleState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function replacementOptions(battle) {
  return Array.isArray(battle?.player_replacement_options)
    ? battle.player_replacement_options
    : [];
}

function playerReplacementVisible(battle) {
  return battle?.phase === SAFARI_BATTLE_PHASE.REPLACEMENT && replacementOptions(battle).length > 0;
}

function clearReplacementUi() {
  byId("player-replacement-panel")?.remove();
  const card = byId("battle-card");
  if (card) delete card.dataset.playerReplacementRequired;
}

function replacementButton(option) {
  const pokemon = option?.pokemon ?? {};
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.playerReplacementPartyIndex = String(option.partyIndex);
  button.disabled = selecting;

  const name = document.createElement("strong");
  name.textContent = pokemon.species ?? `Party ${Number(option.partyIndex) + 1}`;
  const meta = document.createElement("small");
  meta.textContent = `Lv.${Number(pokemon.level ?? 0)} / HP ${Number(pokemon.hp ?? 0)} / ${Number(pokemon.max_hp ?? 0)}`;
  button.append(name, meta);
  return button;
}

function syncReplacementUi() {
  const battle = battleState();
  if (!playerReplacementVisible(battle)) {
    clearReplacementUi();
    return;
  }

  const options = replacementOptions(battle);
  const card = byId("battle-card");
  const moves = byId("moves");
  if (!card || !moves) return;

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
  grid.replaceChildren(...options.map(replacementButton));
  panel.replaceChildren(heading, grid);
}

async function chooseReplacement(button) {
  if (selecting) return;
  const battle = battleState();
  if (!playerReplacementVisible(battle)) return;
  const partyIndex = Number(button.dataset.playerReplacementPartyIndex);
  const legal = replacementOptions(battle)
    .some((option) => Number(option?.partyIndex) === partyIndex);
  if (!legal) return;

  selecting = true;
  syncReplacementUi();
  try {
    await replaceSafariBattlePlayer(globalThis.__maplessSafariRuntime, partyIndex);
  } catch (error) {
    globalThis.__maplessLastError = error;
  } finally {
    selecting = false;
    queueMicrotask(syncReplacementUi);
  }
}

byId("battle-card")?.addEventListener("click", (event) => {
  const battle = battleState();
  if (!playerReplacementVisible(battle)) return;
  const replacement = event.target.closest("button[data-player-replacement-party-index]");
  if (!replacement) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void chooseReplacement(replacement);
}, true);

window.addEventListener("safari-runtime-changed", () => queueMicrotask(syncReplacementUi));
window.addEventListener("pageshow", () => queueMicrotask(syncReplacementUi));
queueMicrotask(syncReplacementUi);

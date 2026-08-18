import { replaceSafariBattlePlayer } from "./runtime/safari-web-playable-integration.js";

const byId = (id) => document.getElementById(id);
let selecting = false;

function battleState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function clearReplacementUi() {
  byId("player-replacement-panel")?.remove();
  const card = byId("battle-card");
  if (card) delete card.dataset.playerReplacementRequired;
  for (const id of ["moves", "capture", "flee"]) {
    const node = byId(id);
    if (node) node.inert = false;
  }
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
  if (!battle?.player_replacement_required || battle.completed) {
    clearReplacementUi();
    return;
  }

  const options = Array.isArray(battle.player_replacement_options)
    ? battle.player_replacement_options
    : [];
  const card = byId("battle-card");
  const moves = byId("moves");
  const capture = byId("capture");
  const flee = byId("flee");
  if (!card || !moves) return;

  card.dataset.playerReplacementRequired = "true";
  moves.inert = true;
  if (capture) capture.inert = true;
  if (flee) flee.inert = true;

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
  grid.className = "player-replacement-options";
  grid.replaceChildren(...options.map(replacementButton));
  panel.replaceChildren(heading, grid);
}

async function chooseReplacement(button) {
  if (selecting) return;
  const battle = battleState();
  if (!battle?.player_replacement_required) return;
  const partyIndex = Number(button.dataset.playerReplacementPartyIndex);
  const legal = (battle.player_replacement_options ?? [])
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
  if (!battle?.player_replacement_required) return;

  const replacement = event.target.closest("button[data-player-replacement-party-index]");
  if (replacement) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void chooseReplacement(replacement);
    return;
  }

  if (event.target.closest("#moves button, #capture, #flee")) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener("safari-runtime-changed", () => queueMicrotask(syncReplacementUi));
window.addEventListener("pageshow", () => queueMicrotask(syncReplacementUi));
queueMicrotask(syncReplacementUi);

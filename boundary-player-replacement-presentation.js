const byId = (id) => document.getElementById(id);

let ownerPromise = null;
let choosing = false;
let renderQueued = false;
let observer = null;

const style = document.createElement("style");
style.textContent = `
.boundary-replacement-sheet[hidden]{display:none}
.boundary-replacement-sheet{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center;padding:20px max(16px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:rgba(3,6,12,.72);backdrop-filter:blur(8px)}
.boundary-replacement-panel{width:min(100%,560px);max-height:min(76dvh,620px);overflow:auto;-webkit-overflow-scrolling:touch;padding:22px 18px;border:1px solid rgba(226,217,255,.26);border-radius:28px;background:linear-gradient(180deg,#171329,#090b14);box-shadow:0 28px 80px rgba(0,0,0,.55)}
.boundary-replacement-kicker{display:block;font-size:11px;letter-spacing:.18em;color:#b9a6e8}.boundary-replacement-panel h3{margin:6px 0 8px;font-size:clamp(25px,7vw,34px)}
.boundary-replacement-copy{margin:0 0 16px;color:#d8d2e8;line-height:1.55}.boundary-replacement-options{display:grid;gap:10px}
.boundary-replacement-option{width:100%;min-height:68px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 14px;text-align:left;border-radius:18px}
.boundary-replacement-option strong{font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.boundary-replacement-option small{display:block;margin-top:4px;opacity:.82}.boundary-replacement-option .hp{font-weight:900;white-space:nowrap}.boundary-replacement-option:disabled{opacity:.38}
@media (max-width:430px){.boundary-replacement-sheet{padding-top:max(14px,env(safe-area-inset-top))}.boundary-replacement-panel{padding:20px 14px}.boundary-replacement-option{min-height:72px}}
`;
document.head.append(style);

function integration() {
  ownerPromise ??= import("./runtime/safari-playable-integration.js");
  return ownerPromise;
}

function boundaryBattle() {
  const runtime = globalThis.__maplessSafariRuntime;
  const battle = runtime?.variables?.mapless?.battle;
  if (!runtime || battle?.origin !== "boundary_trial" || battle.completed) return null;
  return { runtime, battle };
}

function ensureSheet() {
  let sheet = byId("boundary-player-replacement");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "boundary-player-replacement";
  sheet.className = "boundary-replacement-sheet";
  sheet.hidden = true;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "boundary-replacement-title");
  sheet.innerHTML = `<div class="boundary-replacement-panel"><span class="boundary-replacement-kicker">POKÉMON</span><h3 id="boundary-replacement-title">次のポケモンを選ぶ</h3><p class="boundary-replacement-copy" id="boundary-replacement-copy">戦える控えから交代先を選んでください。</p><div class="boundary-replacement-options" id="boundary-replacement-options"></div></div>`;
  document.body.append(sheet);
  sheet.addEventListener("click", onChoice);
  return sheet;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function movePp(move, details) {
  return typeof move === "string" ? details?.totalPp : Number(move?.pp ?? 0);
}

function syncActivePlayerChrome(runtime, battle, presentation) {
  const index = Number(battle.player_party_index ?? 0);
  if (!Number.isInteger(index) || index < 0 || index >= runtime.player.party.length) return;
  const player = runtime.player.party[index];
  if (!player) return;

  const name = byId("player-name");
  const level = byId("player-level");
  const hp = byId("player-hp");
  const hpBar = byId("player-hp-bar");
  if (name && name.textContent !== String(player.species ?? player.name ?? "---")) name.textContent = String(player.species ?? player.name ?? "---");
  if (level && level.textContent !== `Lv.${player.level}`) level.textContent = `Lv.${player.level}`;
  if (hp && hp.textContent !== `${player.hp} / ${player.max_hp}`) hp.textContent = `${player.hp} / ${player.max_hp}`;
  if (hpBar) {
    const max = Number(player.max_hp ?? 0);
    const width = max > 0 ? Math.max(0, Math.min(100, Number(player.hp ?? 0) / max * 100)) : 0;
    hpBar.style.width = `${width}%`;
  }

  const moves = byId("moves");
  if (!moves) return;
  const fingerprint = `${index}|${(player.moves ?? []).map((move) => `${moveId(move)}:${typeof move === "string" ? "s" : Number(move?.pp ?? 0)}`).join("|")}`;
  const currentButtons = [...moves.querySelectorAll("button[data-move-id]")];
  const alreadySynced = moves.dataset.boundaryPlayerFingerprint === fingerprint
    && currentButtons.length > 0
    && currentButtons.every((button) => button.dataset.boundaryPlayerIndex === String(index));
  if (alreadySynced) return;
  const buttons = (player.moves ?? []).map((move) => {
    const id = moveId(move);
    const details = presentation?.[id];
    if (!id || !details) return null;
    const pp = movePp(move, details);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.moveId = id;
    button.dataset.boundaryPlayerIndex = String(index);
    button.disabled = choosing || pp <= 0 || Boolean(battle.player_replacement_required);
    const title = document.createElement("strong");
    title.textContent = details.name;
    const meta = document.createElement("small");
    meta.textContent = `威力 ${details.power} / PP ${pp}${details.priority ? ` / 優先度 +${details.priority}` : ""}`;
    button.append(title, meta);
    return button;
  }).filter(Boolean);
  moves.replaceChildren(...buttons);
  moves.dataset.boundaryPlayerFingerprint = fingerprint;
}

async function renderNow() {
  const current = boundaryBattle();
  const sheet = ensureSheet();
  if (!current) {
    sheet.hidden = true;
    return;
  }

  const { runtime, battle } = current;
  if (Number(battle.player_party_index ?? 0) !== 0 || battle.player_replacement_required) {
    try {
      const module = await integration();
      syncActivePlayerChrome(runtime, battle, module.SAFARI_MOVE_PRESENTATION);
    } catch (_) {}
  }

  if (!battle.player_replacement_required) {
    sheet.hidden = true;
    return;
  }

  const message = byId("battle-message");
  if (message) message.textContent = "交代するポケモンを選んでください。";
  byId("moves")?.querySelectorAll("button").forEach((button) => { button.disabled = true; });

  try {
    const module = await integration();
    const result = module.resolveSafariBoundaryPlayerReplacement(runtime);
    if (result.result !== "replacement_selection_required") {
      sheet.hidden = true;
      return;
    }
    const options = result.playerReplacementContinuation?.replacementOptions ?? [];
    const nodes = options.map((option) => {
      const pokemon = option.pokemon ?? {};
      const button = document.createElement("button");
      button.type = "button";
      button.className = "boundary-replacement-option";
      button.dataset.partyIndex = String(option.partyIndex);
      button.disabled = choosing || !option.canSwitchIn;
      const info = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = String(pokemon.name ?? pokemon.species ?? `Party ${Number(option.partyIndex) + 1}`);
      const meta = document.createElement("small");
      meta.textContent = `Lv.${pokemon.level ?? "-"}${pokemon.status ? ` / ${pokemon.status}` : ""}`;
      info.append(title, meta);
      const hp = document.createElement("span");
      hp.className = "hp";
      hp.textContent = `HP ${pokemon.hp ?? 0}/${pokemon.max_hp ?? "-"}`;
      button.append(info, hp);
      return button;
    });
    byId("boundary-replacement-options")?.replaceChildren(...nodes);
    sheet.hidden = false;
  } catch (error) {
    const copy = byId("boundary-replacement-copy");
    if (copy) copy.textContent = `交代候補を読み込めません: ${error?.message ?? error}`;
    sheet.hidden = false;
  }
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    void renderNow();
  });
}

async function onChoice(event) {
  const button = event.target.closest("button[data-party-index]");
  if (!button || button.disabled || choosing) return;
  const current = boundaryBattle();
  if (!current?.battle?.player_replacement_required) return;
  choosing = true;
  scheduleRender();
  try {
    const module = await integration();
    const result = module.resolveSafariBoundaryPlayerReplacement(current.runtime, Number(button.dataset.partyIndex));
    if (result.result !== "continued_with_replacement") throw new Error(result.result);
    syncActivePlayerChrome(current.runtime, current.battle, module.SAFARI_MOVE_PRESENTATION);
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
    const message = byId("battle-message");
    if (message) message.textContent = "技を選んでください。";
    ensureSheet().hidden = true;
    requestAnimationFrame(() => byId("moves")?.querySelector("button:not(:disabled)")?.focus({ preventScroll: true }));
  } catch (error) {
    const copy = byId("boundary-replacement-copy");
    if (copy) copy.textContent = `交代できません: ${error?.message ?? error}`;
  } finally {
    choosing = false;
    scheduleRender();
  }
}

function observeBattleCard() {
  const card = byId("battle-card");
  if (!card || observer) return;
  observer = new MutationObserver(scheduleRender);
  observer.observe(card, { childList: true, subtree: true, characterData: true });
}

window.addEventListener("safari-runtime-changed", scheduleRender, { passive: true });
window.addEventListener("pageshow", scheduleRender, { passive: true });
observeBattleCard();
scheduleRender();

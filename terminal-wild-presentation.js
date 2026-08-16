const byId = (id) => document.getElementById(id);
let renderedSignature = "";

function runtimeState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function ensureSheet() {
  let sheet = byId("terminal-wild-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "terminal-wild-sheet";
  sheet.className = "terminal-wild-sheet";
  sheet.hidden = true;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "terminal-wild-title");
  sheet.innerHTML = `
    <div class="terminal-wild-backdrop"></div>
    <div class="terminal-wild-card">
      <span class="terminal-wild-kicker" id="terminal-wild-kicker">BATTLE END</span>
      <div class="terminal-wild-mark" aria-hidden="true">◆</div>
      <h2 id="terminal-wild-title">戦闘終了</h2>
      <p id="terminal-wild-message"></p>
      <div class="terminal-wild-status">
        <div><span>POKÉMON</span><strong id="terminal-wild-pokemon">-</strong></div>
        <div><span>HP</span><strong id="terminal-wild-hp">-</strong></div>
        <div><span>STATUS</span><strong id="terminal-wild-status">-</strong></div>
      </div>
      <button id="terminal-wild-close" type="button">Day Boardへ戻る</button>
    </div>`;
  document.body.append(sheet);
  byId("terminal-wild-close").addEventListener("click", () => {
    const state = runtimeState();
    if (state) state.last_terminal_wild = null;
    renderedSignature = "";
    sheet.hidden = true;
    byId("board-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  return sheet;
}

function statusText(value) {
  if (!value || value === "NONE") return "OK";
  return String(value);
}

function renderTerminalWild() {
  const state = runtimeState();
  const handoff = state?.last_terminal_wild;
  const sheet = ensureSheet();
  if (!handoff?.terminal) {
    sheet.hidden = true;
    return;
  }
  const player = handoff.playerParty?.[0] ?? handoff.player ?? null;
  const signature = JSON.stringify([
    handoff.decision,
    handoff.resultKind,
    player?.species,
    player?.hp,
    player?.max_hp,
    player?.status,
  ]);
  if (signature === renderedSignature && !sheet.hidden) return;
  renderedSignature = signature;
  const captured = handoff.resultKind === "captured";
  byId("terminal-wild-kicker").textContent = captured ? "CAPTURE COMPLETE" : "ESCAPE COMPLETE";
  byId("terminal-wild-title").textContent = captured ? "捕獲成功" : "逃走成功";
  byId("terminal-wild-message").textContent = captured
    ? "戦闘終了時のParty状態を反映しました。"
    : "戦闘終了時のParty状態を保ったまま離脱しました。";
  byId("terminal-wild-pokemon").textContent = player?.species ?? "-";
  byId("terminal-wild-hp").textContent = player
    ? `${player.hp ?? "-"} / ${player.max_hp ?? "-"}`
    : "-";
  byId("terminal-wild-status").textContent = statusText(player?.status);
  sheet.dataset.resultKind = handoff.resultKind ?? "terminal";
  sheet.hidden = false;
  window.setTimeout(() => byId("terminal-wild-close")?.focus(), 0);
}

ensureSheet();
renderTerminalWild();
new MutationObserver(renderTerminalWild).observe(document.body, {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["hidden", "class", "style"],
});

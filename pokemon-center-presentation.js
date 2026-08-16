const byId = (id) => document.getElementById(id);

function ensureStyle() {
  if (byId("pokemon-center-presentation-style")) return;
  const style = document.createElement("style");
  style.id = "pokemon-center-presentation-style";
  style.textContent = `
    .center-heal-overlay{position:fixed;inset:0;z-index:80;display:grid;align-items:end;background:linear-gradient(180deg,rgba(2,8,14,.24),rgba(2,8,14,.86));padding:18px max(16px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    .center-heal-overlay[hidden]{display:none}
    .center-heal-sheet{width:min(100%,560px);margin:0 auto;border:1px solid rgba(156,224,255,.42);border-radius:26px;background:radial-gradient(circle at 50% 0%,rgba(103,205,255,.2),transparent 42%),linear-gradient(165deg,#10283a,#07131e 64%);box-shadow:0 26px 80px rgba(0,0,0,.52),inset 0 1px rgba(255,255,255,.08);overflow:hidden}
    .center-heal-beacon{height:8px;background:linear-gradient(90deg,transparent,#8ce7ff 24%,#fff 50%,#8ce7ff 76%,transparent);box-shadow:0 0 26px rgba(140,231,255,.7)}
    .center-heal-body{padding:22px 20px 20px;text-align:center}
    .center-heal-mark{width:76px;height:76px;margin:0 auto 14px;display:grid;place-items:center;border:2px solid #b9efff;border-radius:50%;background:rgba(47,153,205,.2);box-shadow:0 0 0 8px rgba(89,192,238,.07),0 0 34px rgba(89,192,238,.26);font-size:2rem;font-weight:900;color:#e9fbff}
    .center-heal-kicker{margin:0 0 5px;color:#8fdcf7;font-size:.72rem;font-weight:850;letter-spacing:.16em;text-transform:uppercase}
    .center-heal-sheet h2{margin:0;color:#f4fbff;font-size:clamp(1.55rem,7vw,2.15rem);letter-spacing:.02em}
    .center-heal-message{margin:10px auto 0;max-width:28rem;color:#c7d9e6;font-size:.95rem;line-height:1.6}
    .center-heal-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}
    .center-heal-fact{display:grid;gap:3px;padding:12px 6px;border:1px solid rgba(150,214,238,.18);border-radius:14px;background:rgba(2,12,19,.34)}
    .center-heal-fact strong{color:#effbff;font-size:.94rem}
    .center-heal-fact span{color:#829eaf;font-size:.67rem;letter-spacing:.06em}
    .center-heal-action{width:100%;min-height:54px;border:0;border-radius:16px;background:linear-gradient(180deg,#d9f6ff,#8fdcf7);color:#052131;font-size:1rem;font-weight:900;box-shadow:0 8px 22px rgba(71,182,226,.2)}
    .center-heal-action:active{transform:translateY(1px)}
    .hud-button.center-healed{animation:centerHudHeal .72s ease-out}
    @keyframes centerHudHeal{0%{box-shadow:0 0 0 0 rgba(121,226,255,.7)}60%{box-shadow:0 0 0 10px rgba(121,226,255,0)}100%{box-shadow:none}}
    @media(min-width:700px){.center-heal-overlay{align-items:center}.center-heal-body{padding:28px 28px 26px}}
    @media(prefers-reduced-motion:reduce){.hud-button.center-healed{animation:none}}
  `;
  document.head.append(style);
}

function ensureOverlay() {
  let overlay = byId("pokemon-center-heal-overlay");
  if (overlay) return overlay;
  overlay = document.createElement("section");
  overlay.id = "pokemon-center-heal-overlay";
  overlay.className = "center-heal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "pokemon-center-heal-title");
  overlay.innerHTML = `
    <article class="center-heal-sheet">
      <div class="center-heal-beacon" aria-hidden="true"></div>
      <div class="center-heal-body">
        <div class="center-heal-mark" aria-hidden="true">+</div>
        <p class="center-heal-kicker">Pokémon Center</p>
        <h2 id="pokemon-center-heal-title">回復しました</h2>
        <p id="pokemon-center-heal-message" class="center-heal-message">ポケモンたちは元気になりました。</p>
        <div class="center-heal-facts" aria-label="回復内容">
          <div class="center-heal-fact"><strong>HP</strong><span>FULL</span></div>
          <div class="center-heal-fact"><strong>状態</strong><span>CLEAR</span></div>
          <div class="center-heal-fact"><strong>PP</strong><span>FULL</span></div>
        </div>
        <button id="pokemon-center-heal-close" class="center-heal-action" type="button">探索を続ける</button>
      </div>
    </article>`;
  document.body.append(overlay);
  const close = () => {
    overlay.hidden = true;
    byId("board-card")?.scrollIntoView({ block: "start" });
  };
  byId("pokemon-center-heal-close")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  return overlay;
}

function isCenterCell(button) {
  const label = button?.textContent ?? "";
  return /センター|center/i.test(label);
}

function showCenterHealing() {
  const overlay = ensureOverlay();
  const notice = byId("notice")?.textContent?.trim();
  const message = byId("pokemon-center-heal-message");
  if (message && notice) message.textContent = notice;
  overlay.hidden = false;
  const partyHud = byId("menu-party");
  if (partyHud) {
    partyHud.classList.remove("center-healed");
    void partyHud.offsetWidth;
    partyHud.classList.add("center-healed");
  }
  window.setTimeout(() => byId("pokemon-center-heal-close")?.focus(), 0);
}

ensureStyle();
ensureOverlay();

document.addEventListener("click", (event) => {
  const button = event.target.closest?.("button[data-board-index]");
  if (!button || !isCenterCell(button)) return;
  window.requestAnimationFrame(() => {
    const notice = byId("notice")?.textContent ?? "";
    if (/回復できませんでした/.test(notice)) return;
    showCenterHealing();
  });
});

import "./canonical-battleback-presentation-bridge.js";

const CANONICAL_FIELD_MESSAGE = "./assets/canonical-battlebacks/field_message.png";

function applyCanonicalBattleMessageArt() {
  const card = document.getElementById("battle-card");
  const message = document.getElementById("battle-message");
  if (!card || !message) return false;

  message.style.backgroundImage = `url("${CANONICAL_FIELD_MESSAGE}")`;
  message.style.backgroundRepeat = "no-repeat";
  message.style.backgroundPosition = "center";
  message.style.backgroundSize = "100% 100%";
  message.dataset.canonicalBattlebackMessage = "field_message.png";
  return true;
}

function scheduleCanonicalBattleMessageArt() {
  requestAnimationFrame(applyCanonicalBattleMessageArt);
}

window.addEventListener("pageshow", scheduleCanonicalBattleMessageArt, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleCanonicalBattleMessageArt, { passive: true });
window.addEventListener("safari-battle-presentation-event", scheduleCanonicalBattleMessageArt, { passive: true });
applyCanonicalBattleMessageArt();

export { CANONICAL_FIELD_MESSAGE, applyCanonicalBattleMessageArt };

import "./canonical-battleback-presentation-bridge.js";
import { canonicalBattlebackPublishedPath } from "./runtime/canonical-battleback-sources.js";

const CANONICAL_FIELD_MESSAGE = "field_message.png";

function canonicalFieldMessageUrl() {
  const path = canonicalBattlebackPublishedPath(CANONICAL_FIELD_MESSAGE);
  return path ? new URL(path, import.meta.url).href : null;
}

function applyCanonicalBattleMessageArt() {
  const card = document.getElementById("battle-card");
  const message = document.getElementById("battle-message");
  if (!card || !message) return false;

  const url = canonicalFieldMessageUrl();
  if (!url) {
    if (message.dataset.canonicalBattlebackMessage !== CANONICAL_FIELD_MESSAGE) return false;
    message.style.removeProperty("background-image");
    message.style.removeProperty("background-repeat");
    message.style.removeProperty("background-position");
    message.style.removeProperty("background-size");
    delete message.dataset.canonicalBattlebackMessage;
    delete message.dataset.canonicalBattlebackMessagePath;
    return false;
  }

  message.style.backgroundImage = `url("${url}")`;
  message.style.backgroundRepeat = "no-repeat";
  message.style.backgroundPosition = "center";
  message.style.backgroundSize = "100% 100%";
  message.dataset.canonicalBattlebackMessage = CANONICAL_FIELD_MESSAGE;
  message.dataset.canonicalBattlebackMessagePath = url;
  return true;
}

function scheduleCanonicalBattleMessageArt() {
  requestAnimationFrame(applyCanonicalBattleMessageArt);
}

window.addEventListener("pageshow", scheduleCanonicalBattleMessageArt, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleCanonicalBattleMessageArt, { passive: true });
window.addEventListener("safari-battle-presentation-event", scheduleCanonicalBattleMessageArt, { passive: true });
applyCanonicalBattleMessageArt();

export { CANONICAL_FIELD_MESSAGE, canonicalFieldMessageUrl, applyCanonicalBattleMessageArt };

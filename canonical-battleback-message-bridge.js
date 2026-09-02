import "./canonical-battleback-presentation-bridge.js";
import { canonicalBattlebackPublishedPath } from "./runtime/canonical-battleback-sources.js";

const CANONICAL_FIELD_MESSAGE = "field_message.png";

function canonicalFieldMessageUrl() {
  const path = canonicalBattlebackPublishedPath(CANONICAL_FIELD_MESSAGE);
  return path ? new URL(path, import.meta.url).href : null;
}

function clearCanonicalBattleCommandBarArt(commandPanel) {
  if (commandPanel.dataset.canonicalBattlebackMessage !== CANONICAL_FIELD_MESSAGE) return;
  commandPanel.style.removeProperty("background-image");
  commandPanel.style.removeProperty("background-repeat");
  commandPanel.style.removeProperty("background-position");
  commandPanel.style.removeProperty("background-size");
  delete commandPanel.dataset.canonicalBattlebackMessage;
  delete commandPanel.dataset.canonicalBattlebackMessagePath;
}

function applyCanonicalBattleMessageArt() {
  const card = document.getElementById("battle-card");
  const commandPanel = card?.querySelector(".battle-command-panel");
  if (!card || !commandPanel) return false;

  const url = canonicalFieldMessageUrl();
  if (!url) {
    clearCanonicalBattleCommandBarArt(commandPanel);
    return false;
  }

  commandPanel.style.backgroundImage = `url("${url}")`;
  commandPanel.style.backgroundRepeat = "no-repeat";
  commandPanel.style.backgroundPosition = "center";
  commandPanel.style.backgroundSize = "100% 100%";
  commandPanel.dataset.canonicalBattlebackMessage = CANONICAL_FIELD_MESSAGE;
  commandPanel.dataset.canonicalBattlebackMessagePath = url;
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

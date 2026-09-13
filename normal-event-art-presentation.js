import { hasCanonicalNormalEventArtSource, resolveCanonicalNormalEventArt } from "./runtime/canonical-normal-event-art-assets.js?v=20260913-2000";

const STYLE_HREF = "./normal-event-art-presentation.css?v=20260913-2000";
let syncQueued = false;
let styleRetryCount = 0;

function styleLink() {
  return document.querySelector('link[data-mapless-normal-event-art-style="canonical"]');
}

function styleReady() {
  return styleLink()?.dataset.maplessLoadState === "ready";
}

function ensureStyle() {
  let link = styleLink();
  if (link?.dataset.maplessLoadState === "load-error") {
    link.remove();
    link = null;
    styleRetryCount += 1;
  }
  if (link) return link;

  link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.maplessNormalEventArtStyle = "canonical";
  link.dataset.maplessLoadState = "loading";
  link.href = styleRetryCount > 0 ? `${STYLE_HREF}&retry=${Date.now()}` : STYLE_HREF;
  link.onload = () => {
    link.dataset.maplessLoadState = "ready";
    scheduleSync();
  };
  link.onerror = () => {
    link.dataset.maplessLoadState = "load-error";
    const card = document.getElementById("normal-event-card");
    const image = document.getElementById("normal-event-canonical-art");
    if (image instanceof HTMLImageElement) image.hidden = true;
    if (card && !card.hidden) card.dataset.canonicalEventArt = "style-load-error";
    console.error(`[Mapless] canonical normal-event art stylesheet failed to load: ${STYLE_HREF}`);
  };
  document.head.append(link);
  return link;
}

function activeNormalEvent() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  const runtime = globalThis.__maplessSafariRuntime ?? null;
  return active?.runtime === runtime ? active : null;
}

function removeArt() {
  document.getElementById("normal-event-canonical-art")?.remove();
}

function clearArtState(card) {
  if (!card) return;
  delete card.dataset.canonicalEventArt;
  delete card.dataset.canonicalEventArtPath;
}

function syncArt() {
  syncQueued = false;
  const card = document.getElementById("normal-event-card");
  const message = document.getElementById("normal-event-message");
  const active = activeNormalEvent();
  if (!card || card.hidden || !message || !active) {
    removeArt();
    clearArtState(card);
    return;
  }

  const path = resolveCanonicalNormalEventArt(active.eventId);
  if (!path) {
    removeArt();
    card.dataset.canonicalEventArt = hasCanonicalNormalEventArtSource(active.eventId)
      ? "source-known-unpublished"
      : "source-missing";
    delete card.dataset.canonicalEventArtPath;
    return;
  }

  ensureStyle();
  const nextSrc = `./${path}`;
  let image = document.getElementById("normal-event-canonical-art");
  const samePath = card.dataset.canonicalEventArtPath === path;
  const retryingFailedPath = samePath && card.dataset.canonicalEventArt === "load-error";

  if (image instanceof HTMLImageElement && samePath && !retryingFailedPath) {
    if (image.dataset.maplessLoadState === "ready" && styleReady()) {
      image.hidden = false;
      card.dataset.canonicalEventArt = "ready";
    } else {
      image.hidden = true;
      card.dataset.canonicalEventArt = styleLink()?.dataset.maplessLoadState === "load-error"
        ? "style-load-error"
        : "loading";
    }
    return;
  }
  if (retryingFailedPath) {
    image?.remove();
    image = null;
  }

  card.dataset.canonicalEventArt = "loading";
  if (!(image instanceof HTMLImageElement)) {
    image = document.createElement("img");
    image.id = "normal-event-canonical-art";
    image.className = "normal-event-canonical-art";
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    message.before(image);
  }

  image.hidden = true;
  image.dataset.maplessLoadState = "loading";
  image.onload = () => {
    image.dataset.maplessLoadState = "ready";
    scheduleSync();
  };
  image.onerror = () => {
    image.hidden = true;
    image.dataset.maplessLoadState = "load-error";
    card.dataset.canonicalEventArt = "load-error";
    card.dataset.canonicalEventArtPath = path;
    console.error(`[Mapless] canonical normal-event art failed to load: ${path}`);
  };
  card.dataset.canonicalEventArtPath = path;
  image.src = retryingFailedPath ? `${nextSrc}?retry=${Date.now()}` : nextSrc;
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(syncArt);
}

window.addEventListener("safari-normal-event-rendered", scheduleSync, { passive:true });
window.addEventListener("safari-normal-event-closed", scheduleSync, { passive:true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive:true });
window.addEventListener("pageshow", scheduleSync, { passive:true });
scheduleSync();

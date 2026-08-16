const OPTIONAL_UI_STYLES = [
  "./game-menu.css",
  "./battle-presentation.css",
  "./game-presentation.css",
  "./event-presentation.css",
  "./terminal-wild-presentation.css",
  "./shop-touch-presentation.css",
  "./trainer-battle-presentation.css",
];

const OPTIONAL_UI_MODULES = [
  "./game-presentation.js",
  "./camp-presentation.js",
  "./battle-sprite-bridge.js",
  "./game-menu-bridge.js",
  "./party-panel-bridge.js",
  "./storage-panel-bridge.js",
  "./party-storage-controls-bridge.js",
  "./species-form-metadata-bridge.js",
  "./species-sprite-atlas-bridge.js",
  "./canonical-battle-sprite-bridge.js",
  "./terminal-wild-presentation.js",
  "./shop-touch-presentation.js",
  "./trainer-battle-presentation.js",
];

let started = false;

function loadStyles() {
  for (const href of OPTIONAL_UI_STYLES) {
    if (document.querySelector(`link[data-mapless-deferred-style="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.maplessDeferredStyle = href;
    document.head.append(link);
  }
}

async function loadOptionalUi() {
  if (started) return;
  started = true;
  loadStyles();
  for (const modulePath of OPTIONAL_UI_MODULES) {
    try {
      await import(modulePath);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    } catch (error) {
      console.error(`[Mapless] optional UI failed: ${modulePath}`, error);
    }
  }
}

function scheduleOptionalUi() {
  const start = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => loadOptionalUi(), { timeout: 1500 });
    } else {
      window.setTimeout(loadOptionalUi, 400);
    }
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

scheduleOptionalUi();

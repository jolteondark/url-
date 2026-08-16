let started = false;
let startPromise = null;

function notice(text) {
  const node = document.getElementById("notice");
  if (node) node.textContent = text;
}

async function startRuntime() {
  if (started) return startPromise;
  started = true;
  notice("ゲームを読み込んでいます…");
  startPromise = import("./preview.js").catch((error) => {
    started = false;
    notice("ゲームの読み込みに失敗しました。再度タップしてください。");
    console.error("[Mapless] gameplay bootstrap failed", error);
    throw error;
  });
  return startPromise;
}

function armOnce(type) {
  const handler = () => {
    document.removeEventListener(type, handler, true);
    startRuntime();
  };
  document.addEventListener(type, handler, { capture: true, passive: true });
}

armOnce("pointerdown");
armOnce("touchstart");
armOnce("keydown");

window.addEventListener("pageshow", (event) => {
  if (event.persisted) notice("画面をタップするとゲームを再開します。");
}, { passive: true });

let startPromise = null;
let replaying = false;

function notice(text) {
  const node = document.getElementById("notice");
  if (node) node.textContent = text;
}

async function startRuntime(trigger) {
  if (!startPromise) {
    notice("ゲームを読み込んでいます…");
    startPromise = import("./preview.js")
      .then(() => import("./deferred-ui-loader.js"))
      .catch((error) => {
        startPromise = null;
        notice("ゲームの読み込みに失敗しました。もう一度お試しください。");
        console.error("[Mapless] explicit gameplay bootstrap failed", error);
        throw error;
      });
  }
  await startPromise;
  if (trigger && !replaying) {
    replaying = true;
    requestAnimationFrame(() => {
      try { trigger.click(); }
      finally { replaying = false; }
    });
  }
}

const START_SELECTOR = "#new-run,#continue-run,#enter-village,#menu-party,#menu-bag,#menu-box";

document.addEventListener("click", (event) => {
  if (replaying || startPromise) return;
  const trigger = event.target.closest(START_SELECTOR);
  if (!trigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  startRuntime(trigger);
}, true);

notice("新規またはつづきを押すとゲームを開始します。");

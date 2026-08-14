import { resolveCaptureFlow, routeCaughtQueueToPartyStorage, add, quantity, saveRunState, loadRunState } from "./domain-runtime.js";

const STORAGE_KEY = "mapless-web-preview-v2";
const SAVE_OPTIONS = { valueIds: ["player", "variables", "bag", "storage_system"] };
const starter = () => ({ species: "EEVEE", level: 5, hp: 20, status: "NONE", moves: ["TACKLE"] });
const initialRuntime = () => ({
  player: { party: [starter()] },
  variables: { mapless: { day: 1, capture_result: null } },
  bag: { slots: [], money: 0 },
  storage_system: { boxes: [{ name: "Box 1", capacity: 30, slots: [] }], currentBox: 0 },
});
let runtime = initialRuntime();
let logLines = ["実domain接続版です。捕獲/Party・Storage/Bag/Save・Loadはprivate main由来の配信bundleを使用します。"];
const $ = (id) => document.getElementById(id);
function render() {
  $("day").textContent = String(runtime.variables.mapless.day);
  $("party").textContent = `${runtime.player.party.length} / 6`;
  $("bag").textContent = String(quantity(runtime.bag.slots, "POTION"));
  $("money").textContent = String(runtime.bag.money);
  $("log").replaceChildren(...logLines.slice(0, 10).map((line) => { const li = document.createElement("li"); li.textContent = line; return li; }));
}
function note(message) { logLines.unshift(message); render(); }
function capturePokemon() {
  const caught = { species: "PIKACHU", level: 5, hp: 20, status: "NONE", moves: ["THUNDERSHOCK"] };
  const capture = resolveCaptureFlow({ targetFainted: false, trainerBattle: false, ball: "POKEBALL", gainExpForCapture: false, allFaintedAfterCapture: false, capture: { totalHp: 20, hp: 1, catchRate: 255, status: "SLEEP", ball: "POKEBALL", unconditional: true } });
  if (capture.result !== "caught") return note(`捕獲結果: ${capture.result}`);
  const routed = routeCaughtQueueToPartyStorage({ party: runtime.player.party, boxes: runtime.storage_system.boxes, currentBox: runtime.storage_system.currentBox }, [caught]);
  runtime.player.party = routed.state.party; runtime.storage_system.boxes = routed.state.boxes; runtime.storage_system.currentBox = routed.state.currentBox; runtime.variables.mapless.capture_result = capture.result;
  note(`実capture→Party/Storage routing: PIKACHU → ${routed.routed[0]?.result ?? "full"}`);
}
function reward() {
  if (!add(runtime.bag.slots, 20, 99, "POTION", 1)) return note("実Bag add: POTIONを追加できませんでした。");
  runtime.bag.money += 100; note("実Bag mutation: POTION +1 / Money +100");
}
function save() {
  try { const saved = saveRunState(runtime, SAVE_OPTIONS); localStorage.setItem(STORAGE_KEY, saved.payload); note("実Persistence save payloadをlocalStorageへ保存しました。"); }
  catch (error) { note(`保存失敗: ${error?.name || "Error"}`); }
}
function load() {
  try { const payload = localStorage.getItem(STORAGE_KEY); if (!payload) return note("保存データはまだありません。"); runtime = loadRunState(payload, initialRuntime(), SAVE_OPTIONS).state; note("実Persistence loadでruntime stateを復元しました。"); }
  catch (error) { note(`読込失敗: ${error?.name || "Error"}`); }
}
function act(action) {
  switch (action) {
    case "explore": note("探索: まだSafari shell。Mapless探索domain接続は次段階です。"); break;
    case "battle": note("戦闘: まだSafari shell。Battle Core browser接続は次段階です。"); break;
    case "capture": capturePokemon(); break;
    case "reward": reward(); break;
    case "save": save(); break;
    case "load": load(); break;
    case "next": runtime.variables.mapless.day += 1; note(`Day ${runtime.variables.mapless.day}へ進みました（day advanceは暫定shell）。`); break;
    case "reset": runtime = initialRuntime(); logLines = []; try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} note("実domain preview状態をリセットしました。"); break;
  }
  render();
}
document.getElementById("board").addEventListener("click", (event) => { const button = event.target.closest("button[data-action]"); if (button) act(button.dataset.action); });
window.addEventListener("pageshow", render);
render();

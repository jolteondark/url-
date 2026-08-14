import { resolveCaptureFlow, routeCaughtQueueToPartyStorage, add, quantity, saveRunState, loadRunState } from "./domain-runtime.js";
import { resolveOneTurn } from "./battle-runtime.js";

const STORAGE_KEY = "mapless-web-preview-v3";
const SAVE_OPTIONS = { valueIds: ["player", "variables", "bag", "storage_system"] };
const starter = () => ({ species: "EEVEE", level: 5, hp: 20, status: "NONE", moves: ["TACKLE","QUICK_ATTACK","BITE","SWIFT"] });
const initialRuntime = () => ({
  player: { party: [starter()] },
  variables: { mapless: { day: 1, capture_result: null, battle: null } },
  bag: { slots: [], money: 0 },
  storage_system: { boxes: [{ name: "Box 1", capacity: 30, slots: [] }], currentBox: 0 },
});
let runtime = initialRuntime();
let logLines = ["実domain接続版です。BattleはM0193 Battle Core subset、捕獲/Party・Storage/Bag/Save・Loadも実domain由来です。"];
const $ = (id) => document.getElementById(id);
function render() {
  $("day").textContent = String(runtime.variables.mapless.day);
  $("party").textContent = `${runtime.player.party.length} / 6`;
  $("bag").textContent = String(quantity(runtime.bag.slots, "POTION"));
  $("money").textContent = String(runtime.bag.money);
  const battle = runtime.variables.mapless.battle;
  $("battle-card").hidden = !battle;
  if (battle) {
    $("player-hp").textContent = `${battle.playerHp} / 20`;
    $("foe-hp").textContent = `${battle.foeHp} / 20`;
    $("battle-message").textContent = battle.decision === 1 ? "PIKACHUを倒した！" : battle.decision === 2 ? "EEVEEは倒れた…" : `Turn ${battle.turn}: 技を選んでください。`;
    for (const button of document.querySelectorAll("#moves button")) button.disabled = battle.decision > 0;
  }
  $("log").replaceChildren(...logLines.slice(0, 12).map((line) => { const li = document.createElement("li"); li.textContent = line; return li; }));
}
function note(message) { logLines.unshift(message); render(); }
function startBattle() {
  runtime.variables.mapless.battle = { playerHp: runtime.player.party[0]?.hp ?? 20, foeHp: 20, turn: 1, decision: 0 };
  note("野生のPIKACHUとのBattle Core戦闘を開始しました。");
  $("battle-card").scrollIntoView({ behavior: "smooth", block: "center" });
}
function useMove(button) {
  const battle = runtime.variables.mapless.battle;
  if (!battle || battle.decision > 0) return;
  const moveId = button.dataset.move;
  const damage = Number(button.dataset.damage);
  const priority = Number(button.dataset.priority);
  const foeDamage = 4;
  const turn = resolveOneTurn({
    playerHp: battle.playerHp,
    foeHp: battle.foeHp,
    actions: [
      { moveId, target: "foe", targetMaxHp: 20, calculatedDamage: damage, accuracyHit: true },
      { moveId: "THUNDERSHOCK", target: "player", targetMaxHp: 20, calculatedDamage: foeDamage, accuracyHit: true },
    ],
    priorityEntries: [
      { actionIndex: 0, speed: 12, movePriority: priority, tieBreaker: 1 },
      { actionIndex: 1, speed: 10, movePriority: 0, tieBreaker: 0 },
    ],
  });
  battle.playerHp = turn.playerHp; battle.foeHp = turn.foeHp; battle.decision = turn.decision; battle.turn += 1;
  if (runtime.player.party[0]) runtime.player.party[0].hp = battle.playerHp;
  const order = turn.operations.find((op) => op.op === "calculate_priority")?.order?.join("→") ?? "?";
  note(`Battle Core: ${moveId} / priority ${order} / HP ${battle.playerHp}-${battle.foeHp}${battle.decision===1?" / WIN":battle.decision===2?" / LOSE":""}`);
}
function capturePokemon() {
  const caught = { species: "PIKACHU", level: 5, hp: 20, status: "NONE", moves: ["THUNDERSHOCK"] };
  const currentBattle = runtime.variables.mapless.battle;
  const foeHp = currentBattle?.foeHp ?? 1;
  const capture = resolveCaptureFlow({ targetFainted: foeHp <= 0, trainerBattle: false, ball: "POKEBALL", gainExpForCapture: false, allFaintedAfterCapture: false, capture: { totalHp: 20, hp: Math.max(1, foeHp), catchRate: 255, status: "SLEEP", ball: "POKEBALL", unconditional: true } });
  if (capture.result !== "caught") return note(`捕獲結果: ${capture.result}`);
  const routed = routeCaughtQueueToPartyStorage({ party: runtime.player.party, boxes: runtime.storage_system.boxes, currentBox: runtime.storage_system.currentBox }, [caught]);
  runtime.player.party = routed.state.party; runtime.storage_system.boxes = routed.state.boxes; runtime.storage_system.currentBox = routed.state.currentBox; runtime.variables.mapless.capture_result = capture.result;
  if (currentBattle) runtime.variables.mapless.battle = null;
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
    case "explore": note("探索はまだSafari shellです。"); break;
    case "battle": startBattle(); break;
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
document.getElementById("moves").addEventListener("click", (event) => { const button = event.target.closest("button[data-move]"); if (button) useMove(button); });
window.addEventListener("pageshow", render);
render();

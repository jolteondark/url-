const STORAGE_KEY = "mapless-web-preview-v1";

const initialState = () => ({
  day: 1,
  party: 1,
  bag: 0,
  money: 0,
  log: ["Previewを開始しました。実ゲームdomainの代替ではなくSafari操作確認用です。"]
});

let state = initialState();

const $ = (id) => document.getElementById(id);

function render() {
  $("day").textContent = String(state.day);
  $("party").textContent = `${state.party} / 6`;
  $("bag").textContent = String(state.bag);
  $("money").textContent = String(state.money);
  const log = $("log");
  log.replaceChildren(...state.log.slice(0, 10).map((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    return li;
  }));
}

function note(message) {
  state.log.unshift(message);
  render();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    note("localStorageへ保存しました。");
  } catch (error) {
    note(`保存失敗: ${error?.name || "Error"}`);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return note("保存データはまだありません。");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("invalid preview state");
    state = { ...initialState(), ...parsed, log: Array.isArray(parsed.log) ? parsed.log : [] };
    note("localStorageから読み込みました。");
  } catch (error) {
    note(`読込失敗: ${error?.name || "Error"}`);
  }
}

function act(action) {
  switch (action) {
    case "explore": note("探索入力を受け付けました。タッチ操作OKです。"); break;
    case "battle": note("戦闘request相当の入力を受け付けました。"); break;
    case "capture":
      if (state.party < 6) {
        state.party += 1;
        note("捕獲routing表示: Party空き枠へ1体追加しました。");
      } else {
        note("捕獲routing表示: Party満員のためStorage handoff対象です。");
      }
      break;
    case "reward": state.bag += 1; state.money += 100; note("報酬request/result表示を更新しました。"); break;
    case "save": save(); break;
    case "load": load(); break;
    case "next": state.day += 1; note(`Day ${state.day}へ進みました。`); break;
    case "reset": state = initialState(); try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} note("Preview状態をリセットしました。"); break;
  }
  render();
}

document.getElementById("board").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  act(button.dataset.action);
});

window.addEventListener("pageshow", () => render());
render();

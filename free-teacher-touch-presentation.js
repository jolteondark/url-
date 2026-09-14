import { persistSafariOwnerResult } from "./runtime/safari-owner-result-persistence.js";
import { continueSafariFreeTeacherTouch } from "./runtime/safari-free-teacher-touch.js";

const byId = (id) => document.getElementById(id);
let resolving = false;

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function activeTeacher() {
  const current = runtime();
  const active = globalThis.__maplessNormalEventUi ?? null;
  if (!current || active?.runtime !== current) return null;
  const kind = String(active?.selection?.kind ?? "");
  return kind === "free_teacher_pokemon" || kind === "free_teacher_move_replacement" ? active : null;
}

function buttonFor(action) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.freeTeacherAction = action.id;
  button.className = action.secondary ? "secondary normal-event-choice" : "normal-event-choice";
  button.disabled = resolving || action.disabled === true;
  const title = document.createElement("strong");
  title.textContent = action.label;
  button.append(title);
  if (action.meta) {
    const meta = document.createElement("small");
    meta.textContent = action.meta;
    button.append(meta);
  }
  return button;
}

function actionsFor(active) {
  const selection = active?.selection;
  if (selection?.kind === "free_teacher_pokemon") {
    return [
      ...(selection.entries ?? []).map((entry) => ({
        id:`pokemon:${entry.index}`,
        label:entry.name ?? entry.species ?? `Party ${Number(entry.index) + 1}`,
        meta:entry.selectedMoveId ? `覚える技: ${entry.selectedMoveId}` : undefined,
      })),
      { id:"leave", label:"技を教わらずに立ち去る", secondary:true },
    ];
  }
  if (selection?.kind === "free_teacher_move_replacement") {
    return [
      ...(selection.entries ?? []).map((entry) => ({
        id:`replace:${entry.index}`,
        label:entry.name ?? entry.id ?? `Move ${Number(entry.index) + 1}`,
        meta:`忘れて ${selection.selectedMoveId} を覚える`,
      })),
      { id:"leave", label:"技を教わらずに立ち去る", secondary:true },
    ];
  }
  return [];
}

function render() {
  const active = activeTeacher();
  if (!active) return;
  const actions = byId("normal-event-actions");
  if (!actions) return;
  actions.replaceChildren(...actionsFor(active).map(buttonFor));
}

async function resolve(active, actionId) {
  const current = runtime();
  if (!current) return;
  if (actionId === "leave") return continueSafariFreeTeacherTouch(current, active.boardIndex, { cancelled:true });
  if (active.selection?.kind === "free_teacher_pokemon" && actionId.startsWith("pokemon:")) {
    return continueSafariFreeTeacherTouch(current, active.boardIndex, { pokemonIndex:Number(actionId.slice(8)) });
  }
  if (active.selection?.kind === "free_teacher_move_replacement" && actionId.startsWith("replace:")) {
    return continueSafariFreeTeacherTouch(current, active.boardIndex, {
      pokemonIndex:active.selection.pokemonIndex,
      replacementIndex:Number(actionId.slice(8)),
    });
  }
  throw new RangeError(`unsupported free-teacher presentation action: ${actionId}`);
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-free-teacher-action]");
  if (!button || resolving) return;
  const active = activeTeacher();
  if (!active) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  button.blur();
  render();
  try {
    const current = runtime();
    const result = await resolve(active, button.dataset.freeTeacherAction);
    persistSafariOwnerResult(current, result, window.localStorage);
    if (result?.completed) globalThis.__maplessNormalEventUi = null;
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } catch (error) {
    globalThis.__maplessLastError = error;
    const current = runtime();
    if (current?.variables?.mapless) current.variables.mapless.notice = `イベントエラー: ${error?.message ?? error}`;
  } finally {
    resolving = false;
    render();
  }
}, true);

window.addEventListener("safari-normal-event-rendered", render, { passive:true });
window.addEventListener("safari-normal-event-ui", () => requestAnimationFrame(render), { passive:true });
window.addEventListener("safari-runtime-changed", () => requestAnimationFrame(render), { passive:true });

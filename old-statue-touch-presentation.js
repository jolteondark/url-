import {
  resolveSafariOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatueOfferEntries,
  safariOldStatueOfferNeedsPokemon,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation,
} from "./runtime/safari-old-statue-break-rewards.js?v=20260828-2320";
import { persistSafariOwnerResult } from "./day-board-direct-persistence-handoff.js?v=20260829-1710";

let resolving = false;
function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function statueAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "old_statue" ? event : null;
}
function activeUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "old_statue" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function setUi(index) {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState || !statueAt(index)) return false;
  const presentation = safariOldStatuePresentation(current, index);
  currentState.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"old_statue",
    title:presentation.title,
    message:presentation.message,
    actions:presentation.actions,
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}
function openStatue(index) {
  const currentState = state();
  if (!currentState || !statueAt(index)) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  currentState.board_revealed[index] = true;
  currentState.board_visited[index] = true;
  return setUi(index);
}
function pokemonSelectionOptions(current, index, action) {
  const needsPokemon = action === "pray"
    ? safariOldStatuePrayNeedsPokemon(current, index)
    : action === "offer" && safariOldStatueOfferNeedsPokemon(current, index);
  if (!needsPokemon) return {};
  const candidates = safariOldStatueBonusCandidates(current);
  if (!candidates.length) return { pokemonIndex:NaN };
  const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
  if (!promptFn) return { pokemonIndex:candidates[0].index };
  const lines = candidates.map((entry) => `${entry.index + 1}: ${entry.species}${entry.fainted ? " (ひんし)" : ""}`);
  const raw = promptFn(`石像の加護を受けるポケモンを選んでください。\n${lines.join("\n")}\nキャンセルするとイベントは消費しません。`, String(candidates[0].index + 1));
  if (raw == null) return { pokemonIndex:NaN };
  const chosen = Number(raw) - 1;
  return { pokemonIndex:candidates.some((entry) => entry.index === chosen) ? chosen : NaN };
}
function offerSelectionOptions(current, index, action) {
  if (action !== "offer") return {};
  const entries = safariOldStatueOfferEntries(current, index);
  if (!entries.length) return { offeredItem:"" };
  const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
  if (!promptFn) return { offeredItem:entries[0].id };
  const lines = entries.map((entry, entryIndex) => `${entryIndex + 1}: ${entry.id} ×${entry.qty}`);
  const raw = promptFn(`石像に供える道具を1個選んでください。\n${lines.join("\n")}\nキャンセルすると道具もイベントも消費しません。`, "1");
  if (raw == null) return { offeredItem:"" };
  const chosen = Number(raw) - 1;
  return { offeredItem:Number.isInteger(chosen) && entries[chosen] ? entries[chosen].id : "" };
}
function actionSelectionOptions(current, index, action) {
  return {
    ...offerSelectionOptions(current, index, action),
    ...pokemonSelectionOptions(current, index, action),
  };
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !statueAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { openStatue(index); }
  catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  }
}, { capture:true });

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const active = activeUi();
  const current = runtime();
  if (!button || !active || !current || resolving) return;
  const action = String(button.dataset.normalEventAction ?? "");
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  button.disabled = true;
  try {
    const result = await resolveSafariOldStatueInteraction(
      current,
      active.boardIndex,
      action,
      actionSelectionOptions(current, active.boardIndex, action),
    );
    persistSafariOwnerResult(current, result);
    if (result.completed || result.result === "normal_event_wild_battle_started") globalThis.__maplessNormalEventUi = null;
    else setUi(active.boardIndex);
    publish("safari-runtime-changed");
    if (!result.completed && result.result !== "normal_event_wild_battle_started") publish("safari-normal-event-ui");
  } catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  } finally {
    resolving = false;
  }
}, { capture:true });

import {
  safariTreasureMapSellerPresentation,
  resolveSafariTreasureMapSellerAccusation,
  resolveSafariTreasureMapSellerInteraction,
} from "./safari-treasure-map-interaction.js";
import { persistSafariOwnerResult } from "./safari-owner-result-persistence.js";

let resolving = false;

function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function sellerAt(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "treasure_map_seller" ? event : null;
}

function activeSellerUi() {
  const runtime = globalThis.__maplessSafariRuntime ?? null;
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime && active?.eventId === "treasure_map_seller" ? active : null;
}

function installPresentation(runtime, index) {
  const state = stateOf(runtime);
  const ui = safariTreasureMapSellerPresentation(runtime, index);
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.notice = ui.message;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"treasure_map_seller",
    title:ui.title,
    message:ui.message,
    actions:ui.actions,
  };
  publish("safari-runtime-changed");
  publish("safari-normal-event-ui");
  return { runtime, result:"treasure_map_seller_ready", boundary:"normal_event", notice:state.notice, operations:[] };
}

export function openSafariTreasureMapSellerTouch(runtime, index) {
  if (!sellerAt(runtime, index)) throw new Error("treasure_map_seller board event is required");
  if (stateOf(runtime).board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  return installPresentation(runtime, index);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest?.("button[data-normal-event-action]");
    const active = activeSellerUi();
    const runtime = globalThis.__maplessSafariRuntime ?? null;
    if (!button || !active || !runtime || resolving) return;

    const action = String(button.dataset.normalEventAction ?? "");
    event.preventDefault();
    event.stopImmediatePropagation();
    resolving = true;
    button.disabled = true;

    try {
      const result = action === "accuse"
        ? await resolveSafariTreasureMapSellerAccusation(runtime, active.boardIndex)
        : resolveSafariTreasureMapSellerInteraction(runtime, active.boardIndex, action);

      persistSafariOwnerResult(runtime, result, globalThis.window?.localStorage);

      const battleStarted = result?.result === "normal_event_trainer_battle_started";
      if (battleStarted || result?.completed || result?.terminal) {
        globalThis.__maplessNormalEventUi = null;
      } else {
        const ui = safariTreasureMapSellerPresentation(runtime, active.boardIndex);
        active.title = ui.title;
        active.message = result?.notice ?? ui.message;
        active.actions = ui.actions;
      }
      publish("safari-runtime-changed");
      if (globalThis.__maplessNormalEventUi) publish("safari-normal-event-ui");
    } catch (error) {
      globalThis.__maplessLastError = error;
      const state = runtime?.variables?.mapless;
      if (state) state.notice = `イベントエラー: ${error?.message ?? error}`;
      publish("safari-runtime-changed");
    } finally {
      resolving = false;
    }
  }, { capture:true });
}

import * as base from "./safari-playable-integration-core.js";
import {
  prepareSafariWoundedPokemonCandidate,
  resolveSafariWoundedPokemonDecision,
  safariWoundedHealingInventory,
} from "./safari-wounded-pokemon-integration.js";

export * from "./safari-playable-integration-core.js";
export {
  prepareSafariWoundedPokemonCandidate,
  resolveSafariWoundedPokemonDecision,
  safariWoundedHealingInventory,
} from "./safari-wounded-pokemon-integration.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function interactiveWoundedPokemon(runtime, index) {
  const state = stateOf(runtime);
  let candidate;
  try {
    candidate = prepareSafariWoundedPokemonCandidate(runtime, index);
  } catch (error) {
    if (/creationFormContext\./.test(String(error?.message ?? ""))) {
      state.board_revealed[index] = true;
      state.notice = `傷ついたポケモンの個体生成に必要なcanonical contextが未接続です: ${error.message}`;
      return {
        runtime,
        result: "creation_context_required",
        boundary: "normal_event",
        notice: state.notice,
        operations: [{ op: "wounded_creation_context_required", message: error.message }],
      };
    }
    throw error;
  }

  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
  const alertFn = typeof globalThis.alert === "function" ? globalThis.alert.bind(globalThis) : null;
  const inventory = safariWoundedHealingInventory(runtime);

  if (!confirmFn) {
    state.notice = `傷ついた${candidate.species} Lv.${candidate.level}がいます。回復アイテムで治療できます。`;
    return {
      runtime,
      result: "wounded_pokemon_ready",
      boundary: "normal_event",
      species: candidate.species,
      level: candidate.level,
      healingItems: inventory,
      notice: state.notice,
      operations: [],
    };
  }

  const treat = confirmFn(`傷ついた${candidate.species} Lv.${candidate.level}がいる。\n回復アイテムを使って治療しますか？\n（キャンセルで見捨てて立ち去る）`);
  if (!treat) {
    const result = resolveSafariWoundedPokemonDecision(runtime, index, {
      choice: "leave",
      pokemon: candidate.pokemon,
    });
    return { ...result, boundary: "normal_event" };
  }

  if (inventory.length === 0) {
    const result = resolveSafariWoundedPokemonDecision(runtime, index, {
      choice: "treat",
      itemId: "",
      pokemon: candidate.pokemon,
    });
    if (alertFn) alertFn("回復に使える道具を持っていません。");
    return { ...result, boundary: "normal_event" };
  }

  let itemId = inventory[0].itemId;
  if (promptFn) {
    const menu = inventory.map((entry, i) => `${i + 1}. ${entry.itemId} ×${entry.quantity}`).join("\n");
    const selected = promptFn(`使う回復アイテムを番号で選んでください。\n${menu}`, "1");
    if (selected == null) {
      state.notice = `傷ついた${candidate.species}の治療アイテム選択を取り消しました。`;
      return {
        runtime,
        result: "item_selection_cancelled",
        boundary: "normal_event",
        species: candidate.species,
        level: candidate.level,
        healingItems: inventory,
        notice: state.notice,
        operations: [],
      };
    }
    const selectedIndex = Number.parseInt(selected, 10) - 1;
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= inventory.length) {
      state.notice = "回復アイテムの番号が正しくありません。";
      if (alertFn) alertFn(state.notice);
      return { runtime, result: "item_not_selected", boundary: "normal_event", notice: state.notice, operations: [] };
    }
    itemId = inventory[selectedIndex].itemId;
  }

  const result = resolveSafariWoundedPokemonDecision(runtime, index, {
    choice: "treat",
    itemId,
    pokemon: candidate.pokemon,
  });
  if (alertFn && result.outcome === "joined") alertFn(`${result.joinedPokemon.species}が仲間になった！`);
  else if (alertFn && result.outcome !== "joined") alertFn(result.notice);
  return { ...result, boundary: "normal_event" };
}

export function activateSafariDayBoardCell(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (event?.kind === "normal_event" && event.normal_event_id === "wounded_pokemon") {
    if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", boundary: "normal_event", operations: [] };
    return interactiveWoundedPokemon(runtime, index);
  }
  return base.activateSafariDayBoardCell(runtime, index);
}

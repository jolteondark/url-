import { quantity, remove } from "./bag-economy-mart-flow.js";
import { createBattleStatStageStateCanonical } from "./battle-core-stat-stages.js";
import { applyBitterMedicineHappiness } from "./item-hp-healing-effects.js";
import { BATTLE_BOOST_ITEM_EFFECTS, resolveBattleBoostItemEffect } from "./item-battle-boost-effects.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function normalizedId(itemId) {
  return String(itemId ?? "").toUpperCase();
}

export function isSafariBattleStatBoostItem(itemId) {
  return BATTLE_BOOST_ITEM_EFFECTS[normalizedId(itemId)]?.kind === "raise_stat_stage";
}

export function canSafariUseBattleStatBoostItem(runtime, { itemId, partyIndex = undefined } = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const id = normalizedId(itemId);
  if (!isSafariBattleStatBoostItem(id)) return false;
  if (!battle || battle.completed || battle.player_replacement_required || state.shop) return false;
  if (quantity(runtime.bag?.slots ?? [], id) <= 0) return false;
  const activeIndex = Number(battle.player_party_index ?? 0);
  const targetIndex = partyIndex === undefined ? activeIndex : Number(partyIndex);
  if (!Number.isInteger(targetIndex) || targetIndex !== activeIndex) return false;
  const pokemon = runtime.player?.party?.[targetIndex];
  if (!pokemon || Number(pokemon.hp ?? 0) <= 0 || Number(pokemon.steps_to_hatch ?? 0) > 0) return false;
  const effect = BATTLE_BOOST_ITEM_EFFECTS[id];
  const stages = createBattleStatStageStateCanonical(battle.stat_stages);
  return stages[0][effect.stat] < 6;
}

export function useSafariBattleStatBoostItem(runtime, { itemId, partyIndex = undefined } = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const id = normalizedId(itemId);
  if (!isSafariBattleStatBoostItem(id)) return { runtime, itemId: id, result: "unsupported_item", used: false, operations: [] };
  if (!battle || battle.completed) return { runtime, itemId: id, result: "battle_missing", used: false, operations: [] };
  if (battle.player_replacement_required) return { runtime, itemId: id, result: "replacement_required", used: false, operations: [] };
  if (state.shop) return { runtime, itemId: id, result: "shop_active", used: false, operations: [] };
  if (quantity(runtime.bag?.slots ?? [], id) <= 0) return { runtime, itemId: id, result: "item_missing", used: false, operations: [] };

  const activeIndex = Number(battle.player_party_index ?? 0);
  const targetIndex = partyIndex === undefined ? activeIndex : Number(partyIndex);
  if (!Number.isInteger(targetIndex) || targetIndex !== activeIndex) {
    return { runtime, itemId: id, result: "invalid_target", used: false, operations: [] };
  }
  const pokemon = runtime.player?.party?.[targetIndex];
  if (!pokemon || Number(pokemon.hp ?? 0) <= 0 || Number(pokemon.steps_to_hatch ?? 0) > 0) {
    return { runtime, itemId: id, result: "invalid_target", used: false, operations: [] };
  }

  const definition = BATTLE_BOOST_ITEM_EFFECTS[id];
  const stages = createBattleStatStageStateCanonical(battle.stat_stages);
  const effect = resolveBattleBoostItemEffect({ itemId: id, statStage: stages[0][definition.stat] });
  if (!effect.used) return { runtime, ...effect, partyIndex: targetIndex, operations: [] };

  stages[0][effect.stat] = effect.statStageAfter;
  battle.stat_stages = stages;
  const operations = [
    { op: "use_item_in_battle", item: id, target: "player", party_index: targetIndex },
    {
      op: "raise_stat_stage",
      item: id,
      actor: "player",
      party_index: targetIndex,
      stat: effect.stat,
      stage_before: effect.statStageBefore,
      stage_after: effect.statStageAfter,
      requested_delta: effect.stages,
      applied_delta: effect.statStageAfter - effect.statStageBefore,
    },
  ];

  if (pokemon.happiness != null) {
    const before = Number(pokemon.happiness);
    if (Number.isInteger(before) && before >= 0 && before <= 255) {
      const after = applyBitterMedicineHappiness(before, effect.happinessMethod);
      runtime.player.party[targetIndex] = updatePokemonRuntime(pokemon, { happiness: after });
      if (after !== before) {
        operations.push({
          op: "change_happiness",
          item: id,
          party_index: targetIndex,
          reason: effect.happinessMethod,
          happiness_before: before,
          happiness_after: after,
        });
      }
    }
  }

  if (!remove(runtime.bag.slots, id, 1)) throw new Error(`failed to consume ${id} after successful battle boost validation`);
  operations.push({ op: "remove_item", item: id, quantity: 1 });
  state.last_operations = operations;
  state.notice = `${pokemon.nickname ?? pokemon.species}の${effect.stat}が上がりました。`;
  return {
    runtime,
    itemId: id,
    result: "used",
    used: true,
    partyIndex: targetIndex,
    hpBefore: Number(pokemon.hp ?? 0),
    hpAfter: Number(pokemon.hp ?? 0),
    stat: effect.stat,
    statStageBefore: effect.statStageBefore,
    statStageAfter: effect.statStageAfter,
    operations,
    notice: state.notice,
    persistenceRequested: false,
  };
}

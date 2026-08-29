import { remove } from "./bag-economy-mart-flow.js";
import { browserBattleConfusionTurns, withBrowserBattleConfusion } from "./battle-browser-confusion-transient.js";
import {
  applyBitterMedicineHappiness,
  isHpHealingItem,
  resolveHpHealingItemEffect,
} from "./item-hp-healing-effects.js";
import {
  isPpItem,
  isPpItemUsableInContext,
  ppItemCanAffectPokemon,
  ppItemMoveOptions,
  ppItemNeedsMoveSelection,
  resolvePpItemEffect,
} from "./item-pp-effects.js";
import { isRevivalItem, resolveRevivalItemEffect } from "./item-revival-effects.js";
import {
  isBattleMassStatusHealingItem,
  isStatusHealingItem,
  isStatusHealingItemUsableInContext,
  resolveStatusHealingItemEffect,
  statusHealingItemCanAffectPokemon,
} from "./item-status-healing-effects.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";

export const isSafariHpHealingItem = isHpHealingItem;
export const isSafariStatusHealingItem = isStatusHealingItem;
export const isSafariPpItem = isPpItem;
export const isSafariRevivalItem = isRevivalItem;
export const isSafariBattleNoTargetItem = isBattleMassStatusHealingItem;

export function isSafariPartyUseItem(itemId, context = "field") {
  const id = String(itemId ?? "").toUpperCase();
  return isHpHealingItem(id) || isRevivalItem(id) ||
    (isStatusHealingItem(id) && isStatusHealingItemUsableInContext(id, context)) ||
    (isPpItem(id) && isPpItemUsableInContext(id, context));
}

export function isSafariMoveSelectionItem(itemId, context = "field") {
  return ppItemNeedsMoveSelection(itemId, context);
}

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function itemQuantity(slots, itemId) {
  return (slots ?? []).reduce((total, slot) => {
    if (!slot || slot[0] !== itemId) return total;
    return total + Math.max(0, Math.trunc(Number(slot[1] ?? 0)));
  }, 0);
}

function happinessPatch(pokemon, method) {
  if (!method || pokemon?.happiness == null) return null;
  const before = Number(pokemon.happiness);
  if (!Number.isInteger(before) || before < 0 || before > 255) return null;
  const after = applyBitterMedicineHappiness(before, method);
  return { before, after, method };
}

function activePlayerIndex(state) {
  return Number(state.battle?.player_party_index ?? 0);
}

function isActivePlayerTarget(state, index) {
  return Boolean(state.battle && !state.battle.completed && activePlayerIndex(state) === Number(index));
}

function activeSoundproof(pokemon) {
  return String(pokemon?.ability_id ?? "").toUpperCase() === "SOUNDPROOF";
}

function preserveBattleConfusion(pokemonBefore, pokemonAfter, { context, clear = false } = {}) {
  if (context !== "battle") return pokemonAfter;
  return withBrowserBattleConfusion(pokemonAfter, clear ? 0 : browserBattleConfusionTurns(pokemonBefore));
}

function statusEffectContext(state, pokemon, index, context) {
  const activeBattler = context === "battle" && isActivePlayerTarget(state, index);
  return {
    activeBattler,
    confusionTurns: activeBattler ? browserBattleConfusionTurns(pokemon) : 0,
    soundproof: activeBattler && activeSoundproof(pokemon),
  };
}

export function safariBagItemMoveOptions(runtime, itemId, partyIndex, { context = "field" } = {}) {
  const index = Number(partyIndex);
  const pokemon = runtime?.player?.party?.[index];
  if (!pokemon || !Number.isInteger(index) || index < 0) return [];
  return ppItemMoveOptions({ itemId, pokemon, moveMasters: SAFARI_MOVE_MASTERS, context });
}

export function canSafariBagItemTargetPartyPokemon(runtime, itemId, partyIndex, { context = "field" } = {}) {
  const state = stateOf(runtime);
  const id = String(itemId ?? "").toUpperCase();
  const index = Number(partyIndex);
  const pokemon = runtime.player?.party?.[index];
  if (!pokemon || !Number.isInteger(index) || index < 0 || Number(pokemon.steps_to_hatch ?? 0) > 0) return false;
  const hp = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
  const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? hp ?? 1)));
  if (isHpHealingItem(id)) return hp > 0 && hp < maxHp;
  if (isRevivalItem(id)) return hp === 0;
  if (isPpItem(id) && isPpItemUsableInContext(id, context)) {
    return ppItemCanAffectPokemon({ itemId: id, pokemon, moveMasters: SAFARI_MOVE_MASTERS, context });
  }
  if (!isStatusHealingItem(id) || !isStatusHealingItemUsableInContext(id, context)) return false;
  const effectContext = statusEffectContext(state, pokemon, index, context);
  return statusHealingItemCanAffectPokemon({ itemId: id, pokemon, context, ...effectContext });
}

function massWakeTargets(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) return [];
  const playerIndex = activePlayerIndex(state);
  return [
    { actor: "player", pokemon: runtime.player?.party?.[playerIndex], partyIndex: playerIndex },
    { actor: "foe", pokemon: battle.foe, partyIndex: null },
  ].filter(({ pokemon }) => pokemon && Number(pokemon.hp ?? 0) > 0 &&
    ["SLEEP", "DROWSY"].includes(String(pokemon.status ?? "").toUpperCase()) && !activeSoundproof(pokemon));
}

export function canSafariBagItemUseWithoutTarget(runtime, itemId, { context = "battle" } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  return context === "battle" && isBattleMassStatusHealingItem(id) && massWakeTargets(runtime).length > 0;
}

function consumeItemIfNeeded(runtime, id, consumable, operations) {
  if (!consumable) return;
  const removed = remove(runtime.bag.slots, id, 1);
  if (!removed) throw new Error(`failed to consume ${id} after successful item validation`);
  operations.push({ op: "remove_item", item: id, quantity: 1 });
}

function applyMassWakeBattleItem(runtime, id) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const targets = massWakeTargets(runtime);
  if (targets.length === 0) return { runtime, result: "no_effect", used: false, operations: [] };
  const operations = [{ op: "use_item_in_battle", item: id, target: "all_active_battlers" }];
  for (const target of targets) {
    const before = target.pokemon;
    const updated = preserveBattleConfusion(before, updatePokemonRuntime(before, { status: null, status_count: 0 }), { context: "battle" });
    if (target.actor === "player") runtime.player.party[target.partyIndex] = updated;
    else {
      battle.foe = updated;
      const foeIndex = Number(battle.trainer_party_index ?? -1);
      if (Array.isArray(battle.trainer_party) && foeIndex >= 0 && foeIndex < battle.trainer_party.length) battle.trainer_party[foeIndex] = updated;
    }
    operations.push({ op: "cure_status", item: id, actor: target.actor, status_before: before.status, status_after: null });
  }
  consumeItemIfNeeded(runtime, id, false, operations);
  state.last_operations = operations;
  state.notice = "ポケモンたちは笛の音で目を覚ましました。";
  const player = runtime.player.party[activePlayerIndex(state)];
  return {
    runtime,
    result: "used",
    used: true,
    itemId: id,
    partyIndex: activePlayerIndex(state),
    hpBefore: Number(player?.hp ?? 0),
    hpAfter: Number(player?.hp ?? 0),
    operations,
    notice: state.notice,
    persistenceRequested: false,
    massWake: true,
  };
}

function applyPpItem(runtime, id, pokemon, index, context, moveIndex) {
  const state = stateOf(runtime);
  const effect = resolvePpItemEffect({
    itemId: id,
    pokemon,
    moveMasters: SAFARI_MOVE_MASTERS,
    context,
    moveIndex,
  });
  if (!effect.used) return { runtime, result: effect.result, used: false, operations: [] };

  const hp = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
  const updated = updatePokemonRuntime(pokemon, { moves: effect.moves });
  runtime.player.party[index] = preserveBattleConfusion(pokemon, updated, { context });
  const operations = [{ op: "use_item_on_pokemon", item: id, party_index: index, context }];
  for (const change of effect.changes) {
    if (change.ppAfter !== change.ppBefore) {
      operations.push({
        op: "restore_pp",
        item: id,
        party_index: index,
        move_index: change.moveIndex,
        move: change.moveId,
        pp_before: change.ppBefore,
        pp_after: change.ppAfter,
        amount: change.ppAfter - change.ppBefore,
      });
    }
    if (change.ppupAfter !== change.ppupBefore) {
      operations.push({
        op: "raise_max_pp",
        item: id,
        party_index: index,
        move_index: change.moveIndex,
        move: change.moveId,
        ppup_before: change.ppupBefore,
        ppup_after: change.ppupAfter,
        total_pp_before: change.totalPpBefore,
        total_pp_after: change.totalPpAfter,
      });
    }
  }
  consumeItemIfNeeded(runtime, id, true, operations);
  state.last_operations = operations;
  state.notice = effect.changes.some((change) => change.ppupAfter !== change.ppupBefore)
    ? "わざの最大PPが増えました。"
    : "わざのPPが回復しました。";
  return {
    runtime,
    result: "used",
    used: true,
    itemId: id,
    partyIndex: index,
    moveIndex: effect.moveIndex,
    hpBefore: hp,
    hpAfter: hp,
    ppChanges: effect.changes,
    operations,
    notice: state.notice,
    persistenceRequested: false,
  };
}

function applyRevivalItem(runtime, id, pokemon, index, context) {
  const state = stateOf(runtime);
  const hpBefore = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
  const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? hpBefore ?? 1)));
  const effect = resolveRevivalItemEffect({ itemId: id, hp: hpBefore, maxHp });
  if (!effect.used) return { runtime, result: effect.result, used: false, operations: [] };
  const bitter = happinessPatch(pokemon, effect.happinessMethod);
  const patch = { hp: effect.hpAfter };
  if (effect.curesStatus) {
    patch.status = null;
    patch.status_count = 0;
  }
  if (bitter) patch.happiness = bitter.after;
  runtime.player.party[index] = preserveBattleConfusion(pokemon, updatePokemonRuntime(pokemon, patch), { context, clear: true });
  const operations = [
    { op: "use_item_on_pokemon", item: id, party_index: index, context },
    { op: "revive_pokemon", item: id, party_index: index, hp_before: hpBefore, hp_after: effect.hpAfter, amount: effect.hpGain },
  ];
  if (effect.curesStatus && pokemon.status) operations.push({ op: "cure_status", item: id, party_index: index, status_before: pokemon.status, status_after: null });
  if (bitter) operations.push({ op: "change_happiness", item: id, party_index: index, reason: bitter.method, happiness_before: bitter.before, happiness_after: bitter.after });
  consumeItemIfNeeded(runtime, id, true, operations);
  state.last_operations = operations;
  state.notice = `${pokemon.nickname ?? pokemon.species}は元気を取り戻しました。`;
  return {
    runtime,
    result: "used",
    used: true,
    itemId: id,
    partyIndex: index,
    hpBefore,
    hpAfter: effect.hpAfter,
    statusBefore: pokemon.status ?? null,
    statusAfter: null,
    happinessBefore: bitter?.before ?? null,
    happinessAfter: bitter?.after ?? null,
    operations,
    notice: state.notice,
    persistenceRequested: false,
  };
}

export function applySafariBagItemToPartyPokemon(runtime, { itemId, partyIndex, moveIndex = undefined, context = "field" } = {}) {
  const state = stateOf(runtime);
  const id = String(itemId ?? "").toUpperCase();
  if (!isHpHealingItem(id) && !isStatusHealingItem(id) && !isPpItem(id) && !isRevivalItem(id)) return { runtime, result: "unsupported_item", used: false, operations: [] };
  if (context !== "field" && context !== "battle") throw new RangeError(`unsupported bag item context: ${context}`);
  if (context === "field" && state.battle && !state.battle.completed) return { runtime, result: "battle_active", used: false, operations: [] };
  if (context === "battle" && (!state.battle || state.battle.completed)) return { runtime, result: "battle_missing", used: false, operations: [] };
  if (state.shop) return { runtime, result: "shop_active", used: false, operations: [] };
  if (itemQuantity(runtime.bag?.slots, id) <= 0) return { runtime, result: "item_missing", used: false, operations: [] };
  if (context === "battle" && isBattleMassStatusHealingItem(id)) return applyMassWakeBattleItem(runtime, id);

  const index = Number(partyIndex);
  if (!Number.isInteger(index) || index < 0 || index >= (runtime.player?.party?.length ?? 0)) return { runtime, result: "invalid_target", used: false, operations: [] };
  const pokemon = runtime.player.party[index];
  if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) return { runtime, result: "invalid_target", used: false, operations: [] };

  if (isPpItem(id)) return applyPpItem(runtime, id, pokemon, index, context, moveIndex);
  if (isRevivalItem(id)) return applyRevivalItem(runtime, id, pokemon, index, context);

  if (isHpHealingItem(id)) {
    const hpBefore = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
    const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? hpBefore ?? 1)));
    const effect = resolveHpHealingItemEffect({ itemId: id, hp: hpBefore, maxHp });
    if (!effect.used) return { runtime, result: effect.result, used: false, operations: [] };
    const bitter = happinessPatch(pokemon, effect.happinessMethod);
    const operations = [
      { op: "use_item_on_pokemon", item: id, party_index: index, context },
      { op: "heal_hp", item: id, party_index: index, hp_before: hpBefore, hp_after: effect.hpAfter, amount: effect.hpGain },
    ];
    consumeItemIfNeeded(runtime, id, true, operations);
    const patch = { hp: effect.hpAfter };
    if (bitter) patch.happiness = bitter.after;
    runtime.player.party[index] = preserveBattleConfusion(pokemon, updatePokemonRuntime(pokemon, patch), { context });
    if (bitter) operations.splice(2, 0, { op: "change_happiness", item: id, party_index: index, reason: bitter.method, happiness_before: bitter.before, happiness_after: bitter.after });
    state.last_operations = operations;
    state.notice = `${pokemon.nickname ?? pokemon.species}のHPが${effect.hpGain}回復しました。`;
    return { runtime, result: "used", used: true, itemId: id, partyIndex: index, hpBefore, hpAfter: effect.hpAfter, happinessBefore: bitter?.before ?? null, happinessAfter: bitter?.after ?? null, operations, notice: state.notice, persistenceRequested: false };
  }

  const effectContext = statusEffectContext(state, pokemon, index, context);
  const effect = resolveStatusHealingItemEffect({ itemId: id, pokemon, context, ...effectContext });
  if (!effect.used) return { runtime, result: effect.result, used: false, operations: [] };
  const bitter = happinessPatch(pokemon, effect.happinessMethod);
  const patch = { hp: effect.hpAfter, status: effect.statusAfter, status_count: effect.statusAfter ? Number(pokemon.status_count ?? 0) : 0 };
  if (bitter) patch.happiness = bitter.after;
  runtime.player.party[index] = preserveBattleConfusion(pokemon, updatePokemonRuntime(pokemon, patch), { context, clear: effect.confusionCured });
  const operations = [{ op: "use_item_on_pokemon", item: id, party_index: index, context }];
  if (effect.hpGain > 0) operations.push({ op: "heal_hp", item: id, party_index: index, hp_before: effect.hpBefore, hp_after: effect.hpAfter, amount: effect.hpGain });
  if (effect.statusCured) operations.push({ op: "cure_status", item: id, party_index: index, status_before: effect.statusBefore, status_after: null });
  if (effect.confusionCured) operations.push({ op: "cure_confusion", item: id, party_index: index });
  if (bitter) operations.push({ op: "change_happiness", item: id, party_index: index, reason: bitter.method, happiness_before: bitter.before, happiness_after: bitter.after });
  consumeItemIfNeeded(runtime, id, effect.consumable, operations);
  state.last_operations = operations;
  state.notice = `${pokemon.nickname ?? pokemon.species}は元気になりました。`;
  return {
    runtime,
    result: "used",
    used: true,
    itemId: id,
    partyIndex: index,
    hpBefore: effect.hpBefore,
    hpAfter: effect.hpAfter,
    statusBefore: effect.statusBefore,
    statusAfter: effect.statusAfter,
    confusionCured: effect.confusionCured,
    happinessBefore: bitter?.before ?? null,
    happinessAfter: bitter?.after ?? null,
    operations,
    notice: state.notice,
    persistenceRequested: false,
  };
}

export function useSafariBagItemOnPartyPokemon(runtime, options = {}) {
  const state = stateOf(runtime);
  const result = applySafariBagItemToPartyPokemon(runtime, { ...options, context: "field" });
  if (!result.used) return result;
  const operations = [...result.operations, { op: "request_save" }];
  state.last_operations = operations;
  return { ...result, operations, persistenceRequested: true };
}
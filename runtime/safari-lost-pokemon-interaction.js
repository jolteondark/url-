import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { routeCaughtQueueToPartyStorage } from "./caught-queue-party-storage.js";
import { buildGeneralEncounterSpeciesPool } from "./general-encounter-species-pools.js";
import { safariCarryoverPartyLimit } from "./mapless-carry-class-rules.js";
import { resolveLostPokemon } from "./mapless-normal-events-a2-flow.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { ensureSafariGeneralCombatData, safariGeneralCombatModules } from "./safari-general-data-demand.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS, SAFARI_ZERO_STAT_VALUES, safariCanonicalResetMoves } from "./safari-playable-data.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

const LOW_ITEMS = Object.freeze([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);
const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function bagSlots(runtime) { return runtime.bag?.slots ?? []; }
function berryIds(runtime) {
  return [...new Set(bagSlots(runtime)
    .filter((slot) => Array.isArray(slot) && Number(slot[1]) > 0 && /BERRY$/i.test(String(slot[0] ?? "")))
    .map((slot) => String(slot[0])))];
}
function rewardItem(event, salt) {
  const rng = new RubyMT19937Random((Number(event.normal_seed) ^ salt) & 0x7fffffff);
  return LOW_ITEMS[rng.randInt(LOW_ITEMS.length)];
}
function itemMeta(ids) {
  return Object.fromEntries([...new Set(ids)].map((id) => [id, { valid:true, pocket:"general" }]));
}
function rewardTransaction(runtime, items, costs = []) {
  if (items.length === 0 && costs.length === 0) return null;
  return resolveRewardTransaction({
    pockets:{ general:{ slots:bagSlots(runtime), maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:itemMeta([...items, ...costs.map((entry) => entry.item)]),
    items,
    costs,
  });
}
function applyReward(runtime, transaction) {
  if (!transaction?.success) return [];
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return [
    ...transaction.consumed.map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity })),
    ...transaction.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })),
  ];
}
function searchBattleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null;
}
function unit32(rng) { return rng.randInt(0x100000000) / 0x100000000; }

export function safariLostPokemonBerryChoices(runtime) { return berryIds(runtime); }

async function materializeJoinCandidate(runtime, event) {
  await ensureSafariGeneralCombatData("wild");
  const type = String(event.normal_data?.type ?? "");
  const pool = buildGeneralEncounterSpeciesPool(type, ["ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE"]);
  if (pool.length === 0) throw new Error(`lost_pokemon has no canonical unevolved pool for ${type}`);
  const seed = Number(event.normal_seed) & 0x7fffffff;
  const rng = new RubyMT19937Random(seed ^ 0x10a57);
  const species = pool[rng.randInt(pool.length)];
  const encounter = safariGeneralCombatModules("wild").encounterRuntime.resolveSafariGeneralEncounter({
    day:stateOf(runtime).day,
    requiredType:type,
    enemyRank:"NORMAL",
    extraModifier:0,
    speciesRoll:unit32(rng),
    varianceRoll:unit32(rng),
  });
  const level = encounter.resolved_level;
  const moves = safariCanonicalResetMoves(species, level);
  const natureId = "HARDY";
  let pokemon = resolvePokemonRuntimeMasters({
    species,
    level,
    status:"NONE",
    hp:1,
    nature_id:natureId,
    iv:{ ...SAFARI_ZERO_STAT_VALUES },
    ev:{ ...SAFARI_ZERO_STAT_VALUES },
    moves,
  }, {
    species_master:SAFARI_SPECIES_MASTERS[species],
    nature_master:SAFARI_NATURE_MASTERS[natureId],
    move_masters:SAFARI_MOVE_MASTERS,
  });
  pokemon = updatePokemonRuntime(pokemon, { hp:pokemon.max_hp });
  return pokemon;
}

registerSafariNormalEventBattleContinuation("lost_pokemon", (runtime, continuation) => {
  if (continuation.actionId !== "search") throw new Error(`unsupported lost_pokemon Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "lost_pokemon") throw new Error("lost_pokemon continuation requires the originating board event");
  const owner = resolveLostPokemon({ event, action:"search" });
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "start_wild_battle").map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"normal_event_post_battle" },
  ];
  state.notice = "迷子のポケモンの親を探している途中で現れた野生ポケモンとの戦闘を終えました。";
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
});

export async function resolveSafariLostPokemonInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "lost_pokemon") throw new Error("lost_pokemon board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const raw = String(requestedAction ?? "");
  const berry = raw.startsWith("berry:") ? raw.slice(6) : null;
  const action = berry ? "berry" : raw;
  const availableActions = [...berryIds(runtime).map((id) => `berry:${id}`), "join", "search", "leave"];
  if (!availableActions.includes(raw)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };

  if (action === "join") {
    const preview = resolveLostPokemon({ event, action:"join", add_success:true });
    if (preview.outcome === "joined") {
      const pokemon = await materializeJoinCandidate(runtime, event);
      const carryClass = state.mapless_carry_class ?? "general";
      const partyLimit = safariCarryoverPartyLimit(carryClass);
      const routed = routeCaughtQueueToPartyStorage({
        party:runtime.player.party,
        boxes:runtime.storage_system.boxes,
        currentBox:runtime.storage_system.currentBox,
      }, [pokemon], { maxPartySize:partyLimit });
      if (routed.remainingQueue.length > 0) {
        state.notice = "手持ちもボックスもいっぱいです。空きを作れば、このポケモンを仲間にできます。";
        state.last_operations = routed.operations.map((operation) => structuredClone(operation));
        return { runtime, result:"join_storage_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
      }
      runtime.player.party = routed.state.party;
      runtime.storage_system.boxes = routed.state.boxes;
      runtime.storage_system.currentBox = routed.state.currentBox;
      state.board_events[index] = preview.event;
      state.board_consumed[index] = Boolean(preview.event.normal_resolved);
      state.last_operations = [...preview.operations.map((operation) => structuredClone(operation)), ...routed.operations.map((operation) => structuredClone(operation))];
      state.notice = routed.routed[0]?.result === "party" ? `${pokemon.species}が仲間になりました。` : `${pokemon.species}をボックスへ送りました。`;
      return { runtime, result:preview.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner:preview };
    }
    state.board_events[index] = preview.event;
    state.board_consumed[index] = Boolean(preview.event.normal_resolved);
    state.last_operations = preview.operations.map((operation) => structuredClone(operation));
    state.notice = "迷子のポケモンは警戒していて、仲間にはなりませんでした。";
    return { runtime, result:preview.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner:preview };
  }

  if (action === "search") {
    const preview = resolveLostPokemon({ event, action:"search" });
    const battleEvent = searchBattleOperation(preview);
    if (battleEvent) {
      const started = await activateSafariNormalEventWildBattle(runtime, index, {
        eventId:"lost_pokemon",
        actionId:"search",
        battleEvent,
        request:structuredClone(battleEvent),
        payload:{ search_roll:Number(event.normal_data?.search_roll) },
      });
      if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
      return started;
    }
    const rewards = preview.outcome === "search_trainer_reward" ? [rewardItem(event, 0x5ea2c)] : [];
    const transaction = rewardTransaction(runtime, rewards);
    if (transaction && !transaction.success) {
      state.notice = "バッグにお礼の道具を入れる空きがありません。まだ探索は完了していません。";
      state.last_operations = transaction.operations.map((operation) => structuredClone(operation));
      return { runtime, result:"reward_bag_full", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
    }
    const applied = applyReward(runtime, transaction);
    state.board_events[index] = preview.event;
    state.board_consumed[index] = Boolean(preview.event.normal_resolved);
    state.last_operations = [...preview.operations.map((operation) => structuredClone(operation)), ...(transaction?.operations ?? []).map((operation) => structuredClone(operation)), ...applied];
    state.notice = preview.outcome === "search_trainer_reward" ? "飼い主を見つけ、お礼に道具を受け取りました。" : "迷子のポケモンを親元へ返しました。";
    return { runtime, result:preview.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner:preview };
  }

  if (action === "berry") {
    const rewards = [rewardItem(event, 0xbe22f)];
    const transaction = rewardTransaction(runtime, rewards, [{ item:berry, quantity:1 }]);
    if (!transaction?.success) {
      state.notice = transaction?.result === "not_enough_items" ? "そのきのみを持っていません。" : "バッグにお礼の道具を入れる空きがありません。きのみは消費していません。";
      state.last_operations = (transaction?.operations ?? []).map((operation) => structuredClone(operation));
      return { runtime, result:transaction?.result ?? "berry_failed", completed:false, operations:state.last_operations, notice:state.notice, persistenceRequested:false, availableActions };
    }
    const owner = resolveLostPokemon({ event, action:"berry", berry, remove_success:true, rare_thanks:false });
    const applied = applyReward(runtime, transaction);
    state.board_events[index] = owner.event;
    state.board_consumed[index] = Boolean(owner.event.normal_resolved);
    state.last_operations = [...owner.operations.map((operation) => structuredClone(operation)), ...transaction.operations.map((operation) => structuredClone(operation)), ...applied];
    state.notice = "きのみを渡すと、迷子のポケモンがお礼の道具を残しました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const owner = resolveLostPokemon({ event, action:"leave" });
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = owner.operations.map((operation) => structuredClone(operation));
  state.notice = "迷子のポケモンをその場に残して立ち去りました。";
  return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}

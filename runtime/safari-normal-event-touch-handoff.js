import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";
import {
  prepareSafariWoundedPokemonCandidate,
  safariWoundedHealingInventory,
} from "./safari-wounded-pokemon-integration.js";
import { hasSafariUsablePartyType } from "./safari-pokemon-type-membership.js";

const SUPPORTED = new Set([
  "street_performer",
  "mushroom_field",
  "hot_spring",
  "fake_nurse",
  "traveling_cook",
  "flooded_river",
  "wounded_pokemon",
]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function scalingValue(day) {
  return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0);
}

function usableParty(runtime) {
  return (runtime.player?.party ?? [])
    .map((pokemon, index) => ({ pokemon, index }))
    .filter(({ pokemon }) => Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0 && pokemon.egg !== true);
}

function pokemonLabel(pokemon) {
  const name = String(pokemon?.nickname || pokemon?.species || "ポケモン");
  const level = Number(pokemon?.level);
  return Number.isFinite(level) ? `${name} Lv.${level}` : name;
}

function woundedDefinition(runtime, index) {
  const state = stateOf(runtime);
  let candidate;
  try {
    candidate = prepareSafariWoundedPokemonCandidate(runtime, index);
  } catch (error) {
    if (/creationFormContext\./.test(String(error?.message ?? ""))) {
      state.board_revealed[index] = true;
      state.notice = `傷ついたポケモンの個体生成に必要なcanonical contextが未接続です: ${error.message}`;
      return {
        blockedResult: {
          runtime,
          result:"creation_context_required",
          boundary:"normal_event",
          notice:state.notice,
          operations:[{ op:"wounded_creation_context_required", message:error.message }],
        },
      };
    }
    throw error;
  }

  const inventory = safariWoundedHealingInventory(runtime);
  const actions = inventory.map((entry) => ({
    id:`treat:${entry.itemId}`,
    label:entry.itemId,
    meta:`×${entry.quantity} · 治療に使う`,
  }));
  if (actions.length === 0) actions.push({ id:"no_item", label:"回復アイテムがありません", disabled:true });
  actions.push({ id:"leave", label:"見捨てて立ち去る", secondary:true });
  return {
    title:"傷ついたポケモン",
    message:`傷ついた${candidate.species} Lv.${candidate.level}がいます。回復アイテムで治療できます。`,
    actions,
    species:candidate.species,
    level:candidate.level,
  };
}

function definition(runtime, eventId, index) {
  const state = stateOf(runtime);
  const scale = scalingValue(state.day);
  if (eventId === "street_performer") {
    const price = 300 + scale * 30;
    return { title:"大道芸人", message:`大道芸人が即席の舞台を開いています。芸を見るには${price}円必要です。`, actions:[{id:"watch",label:"芸を見る",meta:`${price}円`},{id:"leave",label:"立ち去る",secondary:true}] };
  }
  if (eventId === "mushroom_field") {
    const nominal = 400 + scale * 120;
    const amount = maplessCarryMoneyGain(nominal, state.mapless_carry_class ?? "general");
    const targets = usableParty(runtime);
    const poison = hasSafariUsablePartyType(runtime, "POISON");
    const actions = [];
    for (const { pokemon, index: partyIndex } of targets) {
      actions.push({ id:`eat:${partyIndex}`, label:`${pokemonLabel(pokemon)}に食べさせる`, meta:"能力上昇・回復・状態異常・ダメージの可能性" });
    }
    if (poison) {
      for (const { pokemon, index: partyIndex } of targets) {
        actions.push({ id:`poison:${partyIndex}`, label:`鑑定して${pokemonLabel(pokemon)}に食べさせる`, meta:"どくタイプが安全判定 · 能力+1" });
      }
    }
    actions.push({id:"sell",label:"採取して売る",meta:`+${amount}円`},{id:"leave",label:"立ち去る",secondary:true});
    return {
      title:"怪しいキノコ畑",
      message: poison
        ? `怪しいキノコが群生しています。どくタイプなら安全なものを見分けられそうです。売れば${amount}円です。`
        : `怪しいキノコが群生しています。食べるか、${amount}円で売るか選べます。`,
      actions,
    };
  }
  if (eventId === "hot_spring") {
    const actions = [];
    if (hasSafariUsablePartyType(runtime, "WATER", "ICE")) actions.push({id:"safe",label:"安全に温泉を整える",meta:"みず/こおりタイプ · 全回復"});
    actions.push({id:"enter",label:"温泉に入る",meta:"結果は入ってから"},{id:"leave",label:"立ち去る",secondary:true});
    return { title:"温泉", message:"岩の割れ目から温泉が湧いています。", actions };
  }
  if (eventId === "fake_nurse") {
    const price = 500 + scale * 100;
    return { title:"簡易診療所", message:`看護師が${price}円で治療すると声をかけてきます。`, actions:[{id:"pay",label:"治療を受ける",meta:`${price}円`},{id:"leave",label:"警戒して立ち去る",secondary:true}] };
  }
  if (eventId === "traveling_cook") {
    const price = 600 + scale * 100;
    return { title:"旅の料理人", message:`${price}円で料理を作ってくれます。`, actions:[{id:"heal",label:"回復料理",meta:`HP50%回復 · ${price}円`},{id:"medicine",label:"薬膳料理",meta:`状態異常回復 · ${price}円`},{id:"leave",label:"立ち去る",secondary:true}] };
  }
  if (eventId === "flooded_river") {
    const actions = [];
    if (hasSafariUsablePartyType(runtime, "WATER")) actions.push({id:"water",label:"みずタイプに流れを鎮めさせる",meta:"安全に渡る · 道具1〜2個"});
    if (hasSafariUsablePartyType(runtime, "ICE")) actions.push({id:"ice",label:"こおりタイプに川面を凍らせる",meta:"安全に渡る · 道具1個"});
    actions.push({id:"force",label:"強引に渡る",meta:"危険"},{id:"leave",label:"引き返す",secondary:true});
    return {
      title:"増水した川",
      message: actions.some((action) => action.id === "water" || action.id === "ice")
        ? "濁流が進路を遮っています。手持ちのタイプを活かせば安全に渡れそうです。"
        : "濁流が進路を遮っています。",
      actions,
    };
  }
  if (eventId === "wounded_pokemon") return woundedDefinition(runtime, index);
  throw new RangeError(`unsupported normal-event touch id: ${eventId}`);
}

export function supportsSafariNormalEventTouch(eventId) {
  return SUPPORTED.has(String(eventId ?? ""));
}

export function openSafariNormalEventTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  const eventId = String(event?.normal_event_id ?? "");
  if (!event || event.kind !== "normal_event" || !SUPPORTED.has(eventId)) throw new Error("supported normal_event board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  if (eventId !== "wounded_pokemon") state.board_visited[index] = true;
  const ui = definition(runtime, eventId, index);
  if (ui.blockedResult) return ui.blockedResult;
  state.notice = ui.message;
  if (typeof globalThis.document !== "undefined") {
    globalThis.__maplessNormalEventUi = { runtime, boardIndex:index, eventId, ...ui };
    if (typeof globalThis.CustomEvent === "function") {
      globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent("safari-normal-event-ui"));
    }
  }
  return {
    runtime,
    result:`${eventId}_ready`,
    boundary:"normal_event",
    eventId,
    normalEventUi:ui,
    availableActions:ui.actions.filter((action) => action.disabled !== true).map((action) => action.id),
    notice:state.notice,
    operations:[],
  };
}

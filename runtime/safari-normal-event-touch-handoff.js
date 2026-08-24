import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";
import {
  prepareSafariWoundedPokemonCandidate,
  safariWoundedHealingInventory,
} from "./safari-wounded-pokemon-integration.js";
import { hasSafariUsablePartyType } from "./safari-pokemon-type-membership.js";
import { safariMeteorFragmentRockChoices } from "./safari-meteor-fragment-interaction.js";
import { safariLostPokemonBerryChoices } from "./safari-lost-pokemon-interaction.js";
import { safariPhotographerPartyChoices } from "./safari-photographer-interaction.js";

const SUPPORTED = new Set([
  "street_performer",
  "mushroom_field",
  "hot_spring",
  "fake_nurse",
  "traveling_cook",
  "flooded_river",
  "burning_wagon",
  "meteor_fragment",
  "honey_tree",
  "lost_pokemon",
  "photographer",
  "sleeping_giant",
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
    actions.push(
      {id:"enter",label:"温泉に入る",meta:"結果は入ってから"},
      {id:"bottle",label:"温泉水を持ち帰る",meta:"道具1〜2個"},
      {id:"leave",label:"立ち去る",secondary:true},
    );
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
  if (eventId === "burning_wagon") {
    const actions = [];
    if (hasSafariUsablePartyType(runtime, "WATER")) actions.push({id:"water",label:"みずタイプに消火させる",meta:"安全な救助 · 道具2〜3個"});
    if (hasSafariUsablePartyType(runtime, "FIRE")) actions.push({id:"fire",label:"ほのおタイプに延焼を制御させる",meta:"安全な救助 · 道具1個"});
    actions.push({id:"manual",label:"手作業で救助する",meta:"負傷・報酬・やけどの可能性"},{id:"leave",label:"立ち去る",secondary:true});
    return {
      title:"燃える荷馬車",
      message: actions.some((action) => action.id === "water" || action.id === "fire")
        ? "炎上した荷馬車があります。手持ちのタイプを活かせば安全に救助できそうです。"
        : "炎上した荷馬車があります。危険を承知で救助するか選べます。",
      actions,
    };
  }
  if (eventId === "meteor_fragment") {
    const actions = [];
    for (const item of safariMeteorFragmentRockChoices(runtime, index)) {
      actions.push({ id:`rock:${item}`, label:`いわタイプに${item}を選ばせる`, meta:"安全に欠片を選別 · 道具1個" });
    }
    if (hasSafariUsablePartyType(runtime, "STEEL")) actions.push({ id:"steel", label:"はがねタイプに加工させる", meta:"安全 · 道具2〜3個" });
    actions.push(
      { id:"smash", label:"その場で砕く", meta:"報酬または爆発ダメージ" },
      { id:"carry", label:"慎重に持ち帰る", meta:"道具1個" },
      { id:"leave", label:"触れずに立ち去る", secondary:true },
    );
    return {
      title:"隕石のかけら",
      message: actions.some((action) => action.id.startsWith("rock:") || action.id === "steel")
        ? "熱を残した隕石のかけらがあります。手持ちのタイプを活かせば安全に調べられそうです。"
        : "熱を残した隕石のかけらがあります。砕くか、持ち帰るか選べます。",
      actions,
    };
  }
  if (eventId === "honey_tree") {
    const actions = [];
    if (hasSafariUsablePartyType(runtime, "BUG")) actions.push({ id:"bug", label:"むしタイプに安全に調べさせる", meta:"ハチミツ×2" });
    actions.push(
      { id:"bark", label:"樹皮の陰を探す", meta:"きのみ・小さな道具・空振り" },
      { id:"shake", label:"木を揺らす", meta:"むしタイプの野生戦になることがあります" },
      { id:"leave", label:"立ち去る", secondary:true },
    );
    return {
      title:"ハチミツの木",
      message: hasSafariUsablePartyType(runtime, "BUG")
        ? "甘い香りのする木です。むしタイプなら安全にハチミツを回収できそうです。"
        : "甘い香りのする木です。樹皮の陰を調べたり、木を揺らしたりできます。",
      actions,
    };
  }
  if (eventId === "lost_pokemon") {
    const berries = safariLostPokemonBerryChoices(runtime);
    const actions = berries.map((item) => ({ id:`berry:${item}`, label:`${item}を1個あげる`, meta:"きのみ消費とお礼は同時に確定" }));
    if (berries.length === 0) actions.push({ id:"no_berry", label:"渡せるきのみがありません", disabled:true });
    actions.push(
      { id:"join", label:"仲間に誘う", meta:"応じれば未進化ポケモンが加入" },
      { id:"search", label:"親を探す", meta:"お礼・親発見・野生戦の可能性" },
      { id:"leave", label:"その場を離れる", secondary:true },
    );
    return { title:"迷子のポケモン", message:"不安そうなポケモンが一匹でうろついています。", actions };
  }
  if (eventId === "photographer") {
    const requested = String(state.board_events?.[index]?.normal_data?.requested_type ?? "").toUpperCase();
    const actions = safariPhotographerPartyChoices(runtime, state.board_events?.[index]);
    if (actions.length === 0) actions.push({ id:"no_party_match", label:`${requested}タイプの手持ちがいません`, disabled:true });
    actions.push(
      { id:"wild", label:`${requested}タイプの野生ポケモンを探す`, meta:"野生戦 · 撮影成功で賞金＋道具" },
      { id:"leave", label:"撮影を断って立ち去る", secondary:true },
    );
    return { title:"写真家", message:`${requested}タイプのポケモンを撮影したいそうです。`, actions };
  }
  if (eventId === "sleeping_giant") {
    const item = String(state.board_events?.[index]?.normal_data?.display_item ?? "道具");
    return {
      title:"眠る巨体",
      message:`巨大なポケモンが${item}を抱えて眠っています。`,
      actions:[
        { id:"steal", label:"眠っている隙に盗む", meta:"成功なら道具獲得 · 失敗すると強敵戦" },
        { id:"fight", label:"正面から挑む", meta:"強敵戦 · 勝利で道具獲得" },
        { id:"leave", label:"刺激せず立ち去る", secondary:true },
      ],
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

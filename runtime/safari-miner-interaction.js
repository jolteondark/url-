import { add } from "./bag-economy-mart-flow.js";
import { ensureSafariGeneralData } from "./safari-general-data-demand.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { createPokemonNewIndividualV108 } from "./pokemon-new-individual-v108.js";
import { maplessEggShopBaseLevelForDayV108, maplessEggShopHatchLevelForDayV108 } from "./mapless-egg-shop-v108-flow.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

export const MAPLESS_MINER_DIG_COST_V108 = 1000;
export const MAPLESS_MINER_COLLAPSE_PERCENT_V108 = 15;
export const MAPLESS_MINER_OUTCOME_WEIGHTS_V108 = Object.freeze({ fossil:20, valuable:25, stone:20, apology:25, run_away:10 });
export const MAPLESS_MINER_VALUABLE_ITEMS_V108 = Object.freeze(["PEARL","STARDUST","BIGPEARL","STARPIECE","NUGGET","PEARLSTRING","COMETSHARD","BIGNUGGET"]);
export const MAPLESS_MINER_EVOLUTION_STONES_V108 = Object.freeze(["FIRESTONE","THUNDERSTONE","WATERSTONE","LEAFSTONE","MOONSTONE","SUNSTONE","DUSKSTONE","DAWNSTONE","SHINYSTONE","ICESTONE"]);

const FOSSIL_STAGE_V108 = Object.freeze({
  OMANYTE:"ONE_EVOLUTION_BASE",OMASTAR:"ONE_EVOLUTION_FINAL",KABUTO:"ONE_EVOLUTION_BASE",KABUTOPS:"ONE_EVOLUTION_FINAL",AERODACTYL:"NO_EVOLUTION",
  LILEEP:"ONE_EVOLUTION_BASE",CRADILY:"ONE_EVOLUTION_FINAL",ANORITH:"ONE_EVOLUTION_BASE",ARMALDO:"ONE_EVOLUTION_FINAL",CRANIDOS:"ONE_EVOLUTION_BASE",RAMPARDOS:"ONE_EVOLUTION_FINAL",
  SHIELDON:"ONE_EVOLUTION_BASE",BASTIODON:"ONE_EVOLUTION_FINAL",TIRTOUGA:"ONE_EVOLUTION_BASE",CARRACOSTA:"ONE_EVOLUTION_FINAL",ARCHEN:"ONE_EVOLUTION_BASE",ARCHEOPS:"ONE_EVOLUTION_FINAL",
  TYRUNT:"ONE_EVOLUTION_BASE",TYRANTRUM:"ONE_EVOLUTION_FINAL",AMAURA:"ONE_EVOLUTION_BASE",AURORUS:"ONE_EVOLUTION_FINAL",DRACOZOLT:"NO_EVOLUTION",ARCTOZOLT:"NO_EVOLUTION",DRACOVISH:"NO_EVOLUTION",ARCTOVISH:"NO_EVOLUTION",
});

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object") throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function allowedStagesForDay(day) {
  const base = maplessEggShopBaseLevelForDayV108(day);
  if (base < 16) return ["NO_EVOLUTION","ONE_EVOLUTION_BASE","TWO_EVOLUTION_BASE"];
  if (base < 25) return ["NO_EVOLUTION","ONE_EVOLUTION_BASE","TWO_EVOLUTION_MIDDLE"];
  if (base < 36) return ["NO_EVOLUTION","ONE_EVOLUTION_FINAL","TWO_EVOLUTION_MIDDLE"];
  return ["NO_EVOLUTION","ONE_EVOLUTION_FINAL","TWO_EVOLUTION_FINAL"];
}

export function maplessMinerFossilPoolForDayV108(day) {
  const allowed = new Set(allowedStagesForDay(day));
  return Object.keys(FOSSIL_STAGE_V108).filter((species) => allowed.has(FOSSIL_STAGE_V108[species]));
}

function damageForCollapse(runtime) {
  let affected = 0;
  let totalDamage = 0;
  runtime.player.party = (runtime.player?.party ?? []).map((pokemon) => {
    if (!pokemon || Number(pokemon.hp ?? 0) <= 1) return pokemon;
    const maxHp = Math.max(1, Number(pokemon.max_hp ?? pokemon.totalhp ?? pokemon.hp ?? 1));
    const damage = Math.min(Math.ceil(maxHp * 0.10), Number(pokemon.hp) - 1);
    if (damage <= 0) return pokemon;
    affected += 1;
    totalDamage += damage;
    return { ...pokemon, hp:Number(pokemon.hp) - damage };
  });
  return { affected, totalDamage };
}

function canAddItem(runtime, itemId) {
  const slots = (runtime.bag?.slots ?? []).map((slot) => slot ? [slot[0], slot[1]] : null);
  const maxSlots = Number(runtime.bag?.max_slots ?? runtime.bag?.maxSlots ?? 999);
  const maxPer = Number(runtime.bag?.max_per_slot ?? runtime.bag?.maxPerSlot ?? 999);
  return add(slots, maxSlots, maxPer, itemId, 1);
}

function grantItem(runtime, itemId) {
  if (!canAddItem(runtime, itemId)) return false;
  const slots = runtime.bag.slots ?? (runtime.bag.slots = []);
  const maxSlots = Number(runtime.bag?.max_slots ?? runtime.bag?.maxSlots ?? 999);
  const maxPer = Number(runtime.bag?.max_per_slot ?? runtime.bag?.maxPerSlot ?? 999);
  return add(slots, maxSlots, maxPer, itemId, 1);
}

function outcomeFromRoll(roll) {
  if (roll < 20) return "fossil";
  if (roll < 45) return "valuable";
  if (roll < 65) return "stone";
  if (roll < 90) return "apology";
  return "run_away";
}

function refreshMinerUi(runtime, index) {
  const state = stateOf(runtime);
  if (typeof globalThis.document === "undefined") return;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"miner",
    title:"炭鉱夫",
    message:state.notice ?? "1000円を払えば採掘を頼めます。",
    actions:[
      { id:"dig", label:"採掘を頼む", meta:"1000円", disabled:Number(runtime.bag?.money ?? 0) < MAPLESS_MINER_DIG_COST_V108 },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
  };
}

export function openSafariMinerTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "miner") throw new Error("miner board event is required");
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  if (state.board_consumed?.[index]) {
    state.notice = "炭鉱夫はすでに逃げ去っています。";
    return { runtime, result:"already_consumed", completed:true, operations:[] };
  }
  state.notice = Number(runtime.bag?.money ?? 0) < MAPLESS_MINER_DIG_COST_V108
    ? "依頼料の1000円に足りません。所持金を用意すれば後からもう一度頼めます。"
    : "1000円を払えば採掘を頼めます。成果がない場合や坑道が崩れる危険もあります。";
  refreshMinerUi(runtime, index);
  return { runtime, result:"miner_ready", boundary:"miner", availableActions:["dig","leave"], notice:state.notice, operations:[] };
}

export async function resolveSafariMinerAction(runtime, index, action, { randomInt: injectedRandomInt = null, finalPersonalId = null } = {}) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "miner") throw new Error("miner board event is required");
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  if (action === "leave") {
    state.notice = "今回は依頼せず立ち去りました。炭鉱夫はこの場所に残っています。";
    return { runtime, result:"declined", completed:true, consumed:false, operations:[] };
  }
  if (action !== "dig") throw new RangeError("miner action must be dig or leave");
  if (Number(runtime.bag?.money ?? 0) < MAPLESS_MINER_DIG_COST_V108) {
    state.notice = "依頼料の1000円に足りません。";
    refreshMinerUi(runtime, index);
    return { runtime, result:"insufficient_money", completed:false, consumed:false, operations:[] };
  }

  const workRandomInt = injectedRandomInt ?? ((max) => borrowSafariSharedRunRandomInt(runtime, max));
  if (injectedRandomInt == null) ensureSafariEncounterSeed(state);

  runtime.bag.money = Number(runtime.bag.money ?? 0) - MAPLESS_MINER_DIG_COST_V108;
  const operations = [{ op:"miner_payment", amount:MAPLESS_MINER_DIG_COST_V108 }];
  const collapseRoll = Number(workRandomInt(100));
  let collapse = null;
  if (collapseRoll < MAPLESS_MINER_COLLAPSE_PERCENT_V108) {
    collapse = damageForCollapse(runtime);
    state.notice = "坑道が崩れました。採掘はここで中断されました。";
    operations.push(
      { op:"miner_collapse", roll:collapseRoll, ...collapse },
      { op:"request_save", reason:"miner_attempt" },
    );
    state.last_operations = operations;
    refreshMinerUi(runtime, index);
    return {
      runtime,
      result:"collapse",
      completed:false,
      consumed:false,
      collapse,
      outcome:null,
      reward:null,
      persistenceRequested:true,
      operations,
    };
  }

  // #958: the remaining non-collapse branch still needs the recovered v0.9.108 rand(4)
  // mapping and dynamic fossil owner. Keep it on the same shared run RNG stream meanwhile;
  // do not fall back to browser crypto/Math.random.
  const outcomeRoll = Number(workRandomInt(100));
  const outcome = outcomeFromRoll(outcomeRoll);
  let reward = null;

  if (outcome === "run_away") {
    state.board_consumed[index] = true;
    state.notice = "炭鉱夫は依頼料を持ったまま別の抜け道から逃げ去りました。";
    operations.push({ op:"miner_outcome", outcome, roll:outcomeRoll }, { op:"request_save", reason:"miner_attempt" });
    state.last_operations = operations;
    return { runtime, result:"run_away", completed:true, consumed:true, collapse, outcome, persistenceRequested:true, operations };
  }

  if (outcome === "apology") {
    state.notice = "砕けた石ばかりで成果はありませんでした。炭鉱夫は謝っています。";
  } else if (outcome === "valuable" || outcome === "stone") {
    const source = outcome === "valuable" ? MAPLESS_MINER_VALUABLE_ITEMS_V108 : MAPLESS_MINER_EVOLUTION_STONES_V108;
    const itemId = source[Number(workRandomInt(source.length))];
    if (grantItem(runtime, itemId)) {
      reward = { kind:"item", itemId, quantity:1 };
      state.notice = `${itemId}を掘り当てました！`;
    } else {
      state.notice = `${itemId}は見つかりましたが、バッグに空きがなく受け取れませんでした。`;
    }
  } else if (outcome === "fossil") {
    const pool = maplessMinerFossilPoolForDayV108(state.day);
    if (!pool.length) {
      state.notice = "化石らしい欠片は見つかりましたが、復元できませんでした。";
    } else if (!Array.isArray(runtime.player?.party) || runtime.player.party.length >= 6) {
      state.notice = "復元できる化石は見つかりましたが、Safari版で受け取れる手持ち枠がありません。";
    } else {
      await ensureSafariGeneralData();
      const species = pool[Number(workRandomInt(pool.length))];
      const speciesMaster = SAFARI_SPECIES_MASTERS[species];
      if (!speciesMaster) {
        state.notice = "化石の種族データを読み込めず、復元できませんでした。";
      } else {
        const level = maplessEggShopHatchLevelForDayV108(state.day, workRandomInt);
        const pid = finalPersonalId == null ? workRandomInt(0x100000000) : Number(finalPersonalId) >>> 0;
        const created = createPokemonNewIndividualV108({ species, level, speciesMaster, moveMasters:SAFARI_MOVE_MASTERS, randomInt:workRandomInt, finalPersonalId:pid });
        runtime.player.party.push(created.pokemon);
        reward = { kind:"pokemon", species, level };
        state.notice = `${species}が復元され、Lv.${level}で仲間になりました！`;
      }
    }
  }

  operations.push({ op:"miner_outcome", outcome, roll:outcomeRoll, reward }, { op:"request_save", reason:"miner_attempt" });
  state.last_operations = operations;
  refreshMinerUi(runtime, index);
  return { runtime, result:reward ? "rewarded" : outcome, completed:false, consumed:false, collapse, outcome, reward, persistenceRequested:true, operations };
}

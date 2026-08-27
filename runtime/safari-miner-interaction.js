import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import {
  resolveMaplessV108AllowedEvolutionStages,
  resolveMaplessV108EffectiveScalingValue,
  resolveMaplessV108ScaledEnemyLevel,
} from "./mapless-v108-enemy-scaling.js";
import { resolveMaplessV108SpeciesPoolByCategoryAndStages } from "./mapless-v108-species-evolution.js";
import { ensureSafariGeneralData } from "./safari-general-data-demand.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { createPokemonNewIndividualV108 } from "./pokemon-new-individual-v108.js";
import { grantNormalEventPokemon } from "./safari-normal-event-pokemon-grant.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

export const MAPLESS_MINER_DIG_COST_V108 = 1000;
export const MAPLESS_MINER_COLLAPSE_PERCENT_V108 = 5;
export const MAPLESS_MINER_OUTCOME_WEIGHTS_V108 = Object.freeze({ fossil:20, valuable:25, stone:20, apology:25, run_away:10 });
export const MAPLESS_MINER_VALUABLE_ITEMS_V108 = Object.freeze(["PEARL","STARDUST","BIGPEARL","STARPIECE","NUGGET","PEARLSTRING","COMETSHARD","BIGNUGGET"]);
export const MAPLESS_MINER_EVOLUTION_STONES_V108 = Object.freeze(["FIRESTONE","THUNDERSTONE","WATERSTONE","LEAFSTONE","MOONSTONE","SUNSTONE","DUSKSTONE","DAWNSTONE","SHINYSTONE","ICESTONE"]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object") throw new TypeError("runtime variables.mapless state is required");
  return state;
}

export function maplessMinerFossilPoolForDayV108(day) {
  const scaling = resolveMaplessV108EffectiveScalingValue(day, "NORMAL", 0);
  if (scaling == null) return [];
  const allowedStages = resolveMaplessV108AllowedEvolutionStages(scaling);
  return resolveMaplessV108SpeciesPoolByCategoryAndStages({ category:"FOSSIL", allowedStages });
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

function grantItem(runtime, itemId) {
  const slots = runtime.bag?.slots ?? [];
  const maxSlots = Number(runtime.bag?.max_slots ?? runtime.bag?.maxSlots ?? 999);
  const maxPerSlot = Number(runtime.bag?.max_per_slot ?? runtime.bag?.maxPerSlot ?? 999);
  const transaction = resolveRewardTransaction({
    pockets:{ general:{ slots, maxSlots, maxPerSlot } },
    itemMeta:{ [itemId]:{ valid:true, pocket:"general" } },
    items:[itemId],
    costs:[],
  });
  if (!transaction.success) return false;
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return true;
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
    operations.push({ op:"miner_collapse", roll:collapseRoll, ...collapse });
  }

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
    state.notice = collapse ? "坑道が崩れ、さらに成果も見つかりませんでした。炭鉱夫は謝っています。" : "砕けた石ばかりで成果はありませんでした。炭鉱夫は謝っています。";
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
    } else {
      await ensureSafariGeneralData();
      const species = pool[Number(workRandomInt(pool.length))];
      const speciesMaster = SAFARI_SPECIES_MASTERS[species];
      const level = resolveMaplessV108ScaledEnemyLevel({ day:state.day, rank:"NORMAL", extraModifier:0, useVariance:true, randomInt:workRandomInt });
      if (!speciesMaster || !Number.isInteger(level)) {
        state.notice = "化石の種族・レベルをcanonical dataから確定できず、復元できませんでした。";
      } else {
        const pid = finalPersonalId == null ? workRandomInt(0x100000000) : Number(finalPersonalId) >>> 0;
        const created = createPokemonNewIndividualV108({ species, level, speciesMaster, moveMasters:SAFARI_MOVE_MASTERS, randomInt:workRandomInt, finalPersonalId:pid });
        const granted = grantNormalEventPokemon(runtime, created.pokemon);
        operations.push(...granted.operations.map((operation) => structuredClone(operation)));
        if (granted.success) {
          reward = { kind:"pokemon", species, level, destination:granted.result };
          state.notice = granted.result === "party"
            ? `${species}が復元され、Lv.${level}で仲間になりました！`
            : `${species}が復元され、Lv.${level}でボックスへ送られました！`;
        } else {
          state.notice = "復元できる化石は見つかりましたが、手持ちもボックスもいっぱいです。";
        }
      }
    }
  }

  operations.push({ op:"miner_outcome", outcome, roll:outcomeRoll, reward }, { op:"request_save", reason:"miner_attempt" });
  state.last_operations = operations;
  refreshMinerUi(runtime, index);
  return { runtime, result:reward ? "rewarded" : outcome, completed:false, consumed:false, collapse, outcome, reward, persistenceRequested:true, operations };
}

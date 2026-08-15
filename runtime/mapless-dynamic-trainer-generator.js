import { projectGeneralEncounterRules } from "./general-encounter-rules-master.js";
import { projectGeneralEncounterSpeciesPools } from "./general-encounter-species-pools.js";
import { SAFARI_GENERAL_SPECIES_MASTERS, safariCanonicalResetMoves } from "./safari-general-encounter-data-loader.js";

export const MAPLESS_DYNAMIC_TRAINER_ARCHETYPES = Object.freeze([
  ["YOUNGSTER", "たんぱんこぞう", 0], ["LASS", "ミニスカート", 1], ["BUGCATCHER", "むしとりしょうねん", 0],
  ["HIKER", "やまおとこ", 0], ["BEAUTY", "おとなのおねえさん", 1], ["BLACKBELT", "からておう", 0],
  ["BIRDKEEPER", "とりつかい", 0], ["CAMPER", "キャンプボーイ", 0], ["PICNICKER", "ピクニックガール", 1],
  ["FISHERMAN", "つりびと", 0], ["GENTLEMAN", "ジェントルマン", 0], ["LADY", "おじょうさま", 1],
  ["PAINTER", "えかき", 1], ["POKEMANIAC", "ポケモンマニア", 0], ["POKEMONBREEDER", "ポケモンブリーダー", 2],
  ["POKEMONRANGER_M", "ポケモンレンジャー", 0], ["POKEMONRANGER_F", "ポケモンレンジャー", 1],
  ["PSYCHIC_M", "サイキッカー", 0], ["PSYCHIC_F", "サイキッカー", 1], ["SCIENTIST", "けんきゅういん", 0],
  ["SAILOR", "ふなのり", 0], ["SWIMMER_M", "かいパンやろう", 0], ["SWIMMER_F", "ビキニのおねえさん", 1],
  ["TAMER", "もうじゅうつかい", 0], ["ENGINEER", "でんきやのオヤジ", 0], ["ROCKER", "ロッカー", 0],
  ["RUINMANIAC", "いせきマニア", 0], ["SUPERNERD", "りかけいのおとこ", 0], ["JUGGLER", "ジャグラー", 0],
  ["AROMALADY", "アロマなおねえさん", 1],
].map(([id, name, gender]) => Object.freeze({ id, name, gender })));

const MALE_NAMES = Object.freeze(["アキラ","カイト","レン","ハル","ソウタ","ユウ","シン","トウマ","リク","ナギ","レオ","コウ"]);
const FEMALE_NAMES = Object.freeze(["ミオ","ユイ","リン","アオイ","サラ","ナナ","ヒナ","レイ","メイ","コハル","ユナ","マイ"]);
const UNKNOWN_NAMES = Object.freeze(["アサ","ヨル","ソラ","ツキ","ホシ","ナミ"]);
const VARIANCE = Object.freeze([-1, 0, 1]);

function randomUint32() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const out = new Uint32Array(1); globalThis.crypto.getRandomValues(out); return out[0] >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}
function makePicker(values) {
  const supplied = Array.isArray(values) ? values.map((value) => Number(value) >>> 0) : []; let cursor = 0;
  return (length) => { if (!Number.isInteger(length) || length < 1) throw new RangeError("picker length must be positive"); return (cursor < supplied.length ? supplied[cursor++] : randomUint32()) % length; };
}
function chooseDistinct(pool, count, pick) {
  const remaining = [...pool], chosen = [];
  for (let index = 0; index < count; index += 1) chosen.push(remaining.splice(pick(remaining.length), 1)[0]);
  return chosen;
}
function scalingDetails(day, enemyRank = "NORMAL", extraModifier = 0) {
  const rules = projectGeneralEncounterRules(), scaling = rules.enemyScaling;
  const normalizedDay = Math.max(1, Math.trunc(Number(day))); const rank = String(enemyRank).trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(scaling.rankModifiers, rank)) throw new TypeError(`unknown enemyRank ${enemyRank}`);
  const effectiveScalingValue = Math.max(0, Math.floor((normalizedDay - 1) / scaling.dayInterval) + scaling.rankModifiers[rank] + Math.trunc(Number(extraModifier)));
  const baseLevel = Math.min(scaling.maxLevel, Math.max(scaling.minLevel, scaling.baseLevel + effectiveScalingValue * scaling.levelsPerScaling));
  return { day: normalizedDay, rank, effectiveScalingValue, baseLevel };
}
function allowedStages(baseLevel) {
  const band = projectGeneralEncounterRules().stageBands.find((row) => baseLevel >= row.minLevel && baseLevel <= row.maxLevel);
  if (!band) throw new Error(`no encounter stage band for level ${baseLevel}`); return [...band.stages];
}
function speciesPool(stages) {
  const pools = projectGeneralEncounterSpeciesPools(), selected = [];
  for (const byStage of Object.values(pools)) for (const stage of stages) selected.push(...(byStage[stage] ?? []));
  return [...new Set(selected)].filter((id) => Object.prototype.hasOwnProperty.call(SAFARI_GENERAL_SPECIES_MASTERS, id)).sort();
}

export function buildSafariDynamicTrainerPool(day, rank = "NORMAL", extraModifier = 0) {
  const scaling = scalingDetails(day, rank, extraModifier); const stages = allowedStages(scaling.baseLevel);
  return { scaling, allowedStages: stages, pool: speciesPool(stages) };
}
export function generateSafariDynamicTrainer({ day, rank = "NORMAL", extraModifier = 0, partySize = null, randomValues = [] } = {}) {
  const { scaling, allowedStages: stages, pool } = buildSafariDynamicTrainerPool(day, rank, extraModifier); const pick = makePicker(randomValues);
  const count = partySize == null ? 1 + pick(2) : Math.max(1, Math.min(2, Math.trunc(Number(partySize))));
  if (pool.length < count) throw new RangeError(`dynamic trainer pool too small: ${pool.length}/${count}`);
  const archetype = MAPLESS_DYNAMIC_TRAINER_ARCHETYPES[pick(MAPLESS_DYNAMIC_TRAINER_ARCHETYPES.length)];
  const namePool = archetype.gender === 0 ? MALE_NAMES : archetype.gender === 1 ? FEMALE_NAMES : UNKNOWN_NAMES;
  const trainerName = namePool[pick(namePool.length)]; const speciesIds = chooseDistinct(pool, count, pick);
  const party = speciesIds.map((species) => { const level = Math.max(1, Math.min(100, scaling.baseLevel + VARIANCE[pick(VARIANCE.length)])); return Object.freeze({ species, level, move_ids: Object.freeze(safariCanonicalResetMoves(species, level)) }); });
  const levels = party.map((pokemon) => pokemon.level), maxLevel = Math.max(...levels);
  const targetPrize = count * (150 + scaling.effectiveScalingValue * 75), baseMoney = Math.max(1, Math.round(targetPrize / Math.max(maxLevel, 1)));
  return Object.freeze({ trainer_type: archetype.id, trainer_class_name: archetype.name, trainer_name: trainerName, trainer_full_name: `${archetype.name}の${trainerName}`, trainer_gender: archetype.gender, party_size: count, party: Object.freeze(party), species_ids: Object.freeze([...speciesIds]), levels: Object.freeze(levels), day: scaling.day, rank: scaling.rank, effective_scaling_value: scaling.effectiveScalingValue, base_level: scaling.baseLevel, allowed_stages: Object.freeze(stages), prize_money: maxLevel * baseMoney, base_money: baseMoney, skill_level: Math.min(32 + scaling.effectiveScalingValue * 3, 100) });
}

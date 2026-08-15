export const MAPLESS_DYNAMIC_TRAINER_MASTER_VERSION = "0.1.3";

const ARCHETYPES = Object.freeze([
  ["YOUNGSTER", "たんぱんこぞう", 0], ["LASS", "ミニスカート", 1],
  ["BUGCATCHER", "むしとりしょうねん", 0], ["HIKER", "やまおとこ", 0],
  ["BEAUTY", "おとなのおねえさん", 1], ["BLACKBELT", "からておう", 0],
  ["BIRDKEEPER", "とりつかい", 0], ["CAMPER", "キャンプボーイ", 0],
  ["PICNICKER", "ピクニックガール", 1], ["FISHERMAN", "つりびと", 0],
  ["GENTLEMAN", "ジェントルマン", 0], ["LADY", "おじょうさま", 1],
  ["PAINTER", "えかき", 1], ["POKEMANIAC", "ポケモンマニア", 0],
  ["POKEMONBREEDER", "ポケモンブリーダー", 2], ["POKEMONRANGER_M", "ポケモンレンジャー", 0],
  ["POKEMONRANGER_F", "ポケモンレンジャー", 1], ["PSYCHIC_M", "サイキッカー", 0],
  ["PSYCHIC_F", "サイキッカー", 1], ["SCIENTIST", "けんきゅういん", 0],
  ["SAILOR", "ふなのり", 0], ["SWIMMER_M", "かいパンやろう", 0],
  ["SWIMMER_F", "ビキニのおねえさん", 1], ["TAMER", "もうじゅうつかい", 0],
  ["ENGINEER", "でんきやのオヤジ", 0], ["ROCKER", "ロッカー", 0],
  ["RUINMANIAC", "いせきマニア", 0], ["SUPERNERD", "りかけいのおとこ", 0],
  ["JUGGLER", "ジャグラー", 0], ["AROMALADY", "アロマなおねえさん", 1],
].map(([id, name, gender]) => Object.freeze({ id, name, gender })));

const MALE_NAMES = Object.freeze(["アキラ","カイト","レン","ハル","ソウタ","ユウ","シン","トウマ","リク","ナギ","レオ","コウ"]);
const FEMALE_NAMES = Object.freeze(["ミオ","ユイ","リン","アオイ","サラ","ナナ","ヒナ","レイ","メイ","コハル","ユナ","マイ"]);
const UNKNOWN_NAMES = Object.freeze(["アサ","ヨル","ソラ","ツキ","ホシ","ナミ"]);

export const MAPLESS_DYNAMIC_TRAINER_ARCHETYPES = ARCHETYPES;
export const MAPLESS_DYNAMIC_TRAINER_NAMES = Object.freeze({ male: MALE_NAMES, female: FEMALE_NAMES, unknown: UNKNOWN_NAMES });
export const MAPLESS_DYNAMIC_TRAINER_PARTY_SIZE = Object.freeze({ minimum: 1, maximum: 3 });
export const MAPLESS_DYNAMIC_TRAINER_PRIZE = Object.freeze({ base_per_pokemon: 150, per_scaling_per_pokemon: 75 });
export const MAPLESS_DYNAMIC_TRAINER_SKILL = Object.freeze({ base: 32, per_scaling: 3, maximum: 100 });

export function projectMaplessDynamicTrainerMaster() {
  return {
    version: MAPLESS_DYNAMIC_TRAINER_MASTER_VERSION,
    party_size: { ...MAPLESS_DYNAMIC_TRAINER_PARTY_SIZE },
    prize: { ...MAPLESS_DYNAMIC_TRAINER_PRIZE },
    skill: { ...MAPLESS_DYNAMIC_TRAINER_SKILL },
    archetypes: ARCHETYPES.map((entry) => ({ ...entry })),
    names: { male: [...MALE_NAMES], female: [...FEMALE_NAMES], unknown: [...UNKNOWN_NAMES] },
  };
}

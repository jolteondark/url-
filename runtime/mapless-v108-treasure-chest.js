import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const MAPLESS_V108_TREASURE_CHEST_TIER_WEIGHTS = Object.freeze([
  Object.freeze(["normal", 65]),
  Object.freeze(["deluxe", 28]),
  Object.freeze(["supreme", 7]),
]);

export const MAPLESS_V108_TREASURE_CHEST_TIER_CONFIG = Object.freeze({
  normal:Object.freeze({name:"並の宝箱",qualityBonus:0,moneyBase:250,moneyPerScaling:100,baseRolls:1,rollStep:6,maxRolls:3,guaranteedRarity:0}),
  deluxe:Object.freeze({name:"豪華な宝箱",qualityBonus:3,moneyBase:700,moneyPerScaling:250,baseRolls:2,rollStep:5,maxRolls:4,guaranteedRarity:1}),
  supreme:Object.freeze({name:"最上の宝箱",qualityBonus:6,moneyBase:1600,moneyPerScaling:500,baseRolls:3,rollStep:4,maxRolls:5,guaranteedRarity:2}),
});

const E = (id,minQuality,rarity,weight,baseQty,qtyStep,maxQty) => Object.freeze({id,minQuality,rarity,weight,baseQty,qtyStep,maxQty});

export const MAPLESS_V108_TREASURE_CHEST_REWARD_ENTRIES = Object.freeze([
  E("POTION",0,0,18,2,4,5),E("POKEBALL",0,0,18,3,4,8),E("ORANBERRY",0,0,8,2,5,5),E("LEPPABERRY",0,0,5,1,6,3),E("ANTIDOTE",0,0,4,1,6,3),E("PARALYZEHEAL",0,0,4,1,6,3),
  E("SUPERPOTION",2,1,14,2,5,5),E("GREATBALL",2,1,14,3,5,7),E("FULLHEAL",2,1,7,1,6,3),E("ETHER",2,1,6,1,7,3),
  E("HYPERPOTION",4,1,10,1,5,4),E("ULTRABALL",4,1,10,2,5,6),E("REVIVE",4,1,7,1,7,3),E("QUICKBALL",4,1,3,1,7,3),E("DUSKBALL",4,1,3,1,7,3),E("TIMERBALL",4,1,3,1,7,3),
  E("FIRESTONE",4,1,2,1,99,1),E("THUNDERSTONE",4,1,2,1,99,1),E("WATERSTONE",4,1,2,1,99,1),E("LEAFSTONE",4,1,2,1,99,1),E("MOONSTONE",4,1,2,1,99,1),E("SUNSTONE",4,1,2,1,99,1),
  E("MAXPOTION",6,2,5,1,9,2),E("MAXETHER",6,2,4,1,10,2),E("NUGGET",6,2,5,1,10,2),E("RARECANDY",6,2,3,1,12,2),E("STARPIECE",7,2,4,1,10,2),E("PPUP",7,2,2,1,99,1),
  E("FASTBALL",7,2,1,1,12,2),E("LEVELBALL",7,2,1,1,12,2),E("LUREBALL",7,2,1,1,12,2),E("HEAVYBALL",7,2,1,1,12,2),E("LOVEBALL",7,2,1,1,12,2),E("FRIENDBALL",7,2,1,1,12,2),E("MOONBALL",7,2,1,1,12,2),
  E("FULLRESTORE",8,2,4,1,10,2),E("MAXREVIVE",8,2,2,1,99,1),E("ELIXIR",8,2,3,1,99,1),E("DREAMBALL",8,2,1,1,12,2),E("BEASTBALL",8,2,1,1,12,2),
  E("MAXELIXIR",10,3,2,1,99,1),E("ABILITYCAPSULE",10,3,1,1,99,1),E("COMETSHARD",10,3,2,1,99,1),E("BIGNUGGET",11,3,1,1,99,1),E("PPMAX",12,4,1,1,99,1),E("ABILITYPATCH",14,4,1,1,99,1),
]);

function requireRandomInt(randomInt) {
  if (typeof randomInt !== "function") throw new TypeError("caller-owned randomInt is required");
  return randomInt;
}

function weightedPick(entries, randomInt) {
  const total = entries.reduce((sum, entry) => sum + (Array.isArray(entry) ? entry[1] : entry.weight), 0);
  let roll = randomInt(total);
  if (!Number.isInteger(roll) || roll < 0 || roll >= total) throw new RangeError("randomInt returned outside requested range");
  for (const entry of entries) {
    roll -= Array.isArray(entry) ? entry[1] : entry.weight;
    if (roll < 0) return Array.isArray(entry) ? entry[0] : entry;
  }
  return Array.isArray(entries.at(-1)) ? entries.at(-1)[0] : entries.at(-1);
}

export function maplessV108TreasureChestScaling(day) {
  return Math.max(0, Math.floor((Math.max(1, Number(day) || 1) - 1) / 5));
}

export function prepareMaplessV108TreasureChest(event, { day, randomInt, forcedTier = null } = {}) {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new TypeError("treasure event is required");
  if (event.kind !== "treasure") return event;
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  const alreadyPrepared = Boolean(event.chest_tier) && Number.isInteger(event.chest_seed) && Number.isInteger(event.chest_generated_day);
  if (alreadyPrepared) return event;

  const next = { ...event };
  const draw = requireRandomInt(randomInt);
  if (!next.chest_tier) {
    if (forcedTier != null) {
      const tier = String(forcedTier);
      if (!MAPLESS_V108_TREASURE_CHEST_TIER_CONFIG[tier]) throw new RangeError("unknown forced treasure tier");
      next.chest_tier = tier;
    } else {
      next.chest_tier = weightedPick(MAPLESS_V108_TREASURE_CHEST_TIER_WEIGHTS, draw);
    }
  }
  if (!Number.isInteger(next.chest_seed)) next.chest_seed = draw(0x7fffffff);
  if (!Number.isInteger(next.chest_generated_day)) next.chest_generated_day = day;
  return next;
}

export function resolveMaplessV108TreasureChestReward(event, day) {
  if (!event?.chest_tier || !Number.isInteger(event.chest_seed)) throw new Error("prepared treasure event is required");
  const config = MAPLESS_V108_TREASURE_CHEST_TIER_CONFIG[event.chest_tier];
  if (!config) throw new RangeError("unknown treasure tier");
  const scalingValue = maplessV108TreasureChestScaling(day);
  const quality = scalingValue + config.qualityBonus;
  const rng = new RubyMT19937Random(event.chest_seed & 0x7fffffff);
  const rolls = Math.min(config.maxRolls, Math.max(1, config.baseRolls + Math.floor(scalingValue / config.rollStep)));
  const items = new Map();
  for (let i = 0; i < rolls; i += 1) {
    const minimum = i === rolls - 1 ? config.guaranteedRarity : 0;
    let pool = MAPLESS_V108_TREASURE_CHEST_REWARD_ENTRIES.filter((entry) => entry.minQuality <= quality && entry.rarity >= minimum);
    if (pool.length === 0) pool = MAPLESS_V108_TREASURE_CHEST_REWARD_ENTRIES.filter((entry) => entry.minQuality <= quality);
    const entry = weightedPick(pool, (limit) => rng.randInt(limit));
    if (!entry) continue;
    const quantity = Math.min(entry.maxQty, Math.max(1, entry.baseQty + Math.floor(scalingValue / Math.max(1, entry.qtyStep))));
    items.set(entry.id, (items.get(entry.id) ?? 0) + quantity);
  }
  return {
    tier:event.chest_tier,
    tierName:config.name,
    day:Math.max(1, Number(day) || 1),
    scalingValue,
    quality,
    rolls,
    money:config.moneyBase + config.moneyPerScaling * scalingValue,
    items:[...items].map(([itemId, quantity]) => ({ itemId, quantity })),
  };
}

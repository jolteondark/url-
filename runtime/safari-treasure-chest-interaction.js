import { add } from "./bag-economy-mart-flow.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";

const TIER_WEIGHTS = Object.freeze([["normal",65],["deluxe",28],["supreme",7]]);
const TIER_CONFIG = Object.freeze({
  normal:{name:"並の宝箱",qualityBonus:0,moneyBase:250,moneyPerScaling:100,baseRolls:1,rollStep:6,maxRolls:3,guaranteedRarity:0},
  deluxe:{name:"豪華な宝箱",qualityBonus:3,moneyBase:700,moneyPerScaling:250,baseRolls:2,rollStep:5,maxRolls:4,guaranteedRarity:1},
  supreme:{name:"最上の宝箱",qualityBonus:6,moneyBase:1600,moneyPerScaling:500,baseRolls:3,rollStep:4,maxRolls:5,guaranteedRarity:2},
});
const E = (id,minQuality,rarity,weight,baseQty,qtyStep,maxQty) => Object.freeze({id,minQuality,rarity,weight,baseQty,qtyStep,maxQty});
const REWARD_ENTRIES = Object.freeze([
  E("POTION",0,0,18,2,4,5),E("POKEBALL",0,0,18,3,4,8),E("ORANBERRY",0,0,8,2,5,5),E("LEPPABERRY",0,0,5,1,6,3),E("ANTIDOTE",0,0,4,1,6,3),E("PARALYZEHEAL",0,0,4,1,6,3),
  E("SUPERPOTION",2,1,14,2,5,5),E("GREATBALL",2,1,14,3,5,7),E("FULLHEAL",2,1,7,1,6,3),E("ETHER",2,1,6,1,7,3),
  E("HYPERPOTION",4,1,10,1,5,4),E("ULTRABALL",4,1,10,2,5,6),E("REVIVE",4,1,7,1,7,3),E("QUICKBALL",4,1,3,1,7,3),E("DUSKBALL",4,1,3,1,7,3),E("TIMERBALL",4,1,3,1,7,3),
  E("FIRESTONE",4,1,2,1,99,1),E("THUNDERSTONE",4,1,2,1,99,1),E("WATERSTONE",4,1,2,1,99,1),E("LEAFSTONE",4,1,2,1,99,1),E("MOONSTONE",4,1,2,1,99,1),E("SUNSTONE",4,1,2,1,99,1),
  E("MAXPOTION",6,2,5,1,9,2),E("MAXETHER",6,2,4,1,10,2),E("NUGGET",6,2,5,1,10,2),E("RARECANDY",6,2,3,1,12,2),E("STARPIECE",7,2,4,1,10,2),E("PPUP",7,2,2,1,99,1),
  E("FASTBALL",7,2,1,1,12,2),E("LEVELBALL",7,2,1,1,12,2),E("LUREBALL",7,2,1,1,12,2),E("HEAVYBALL",7,2,1,1,12,2),E("LOVEBALL",7,2,1,1,12,2),E("FRIENDBALL",7,2,1,1,12,2),E("MOONBALL",7,2,1,1,12,2),
  E("FULLRESTORE",8,2,4,1,10,2),E("MAXREVIVE",8,2,2,1,99,1),E("ELIXIR",8,2,3,1,99,1),E("DREAMBALL",8,2,1,1,12,2),E("BEASTBALL",8,2,1,1,12,2),
  E("MAXELIXIR",10,3,2,1,99,1),E("ABILITYCAPSULE",10,3,1,1,99,1),E("COMETSHARD",10,3,2,1,99,1),E("BIGNUGGET",11,3,1,1,99,1),E("PPMAX",12,4,1,1,99,1),E("ABILITYPATCH",14,4,1,1,99,1),
]);

function stateOf(runtime){const state=runtime?.variables?.mapless;if(!state)throw new TypeError("runtime variables.mapless state is required");return state;}
function seedFor(day,index){return (Math.imul(Math.max(1,day)>>>0,0x9e3779b1)^Math.imul((index+1)>>>0,0x27d4eb2d)^0x165667b1)>>>0;}
function weightedPick(entries,rng){const total=entries.reduce((s,e)=>s+(Array.isArray(e)?e[1]:e.weight),0);let roll=rng.randInt(total);for(const e of entries){roll-=Array.isArray(e)?e[1]:e.weight;if(roll<0)return Array.isArray(e)?e[0]:e;}return Array.isArray(entries.at(-1))?entries.at(-1)[0]:entries.at(-1);}
function scaling(day){return Math.max(0,Math.floor((Math.max(1,Number(day)||1)-1)/5));}

export function prepareSafariTreasureChestV108(event,{day,index}={}){
  if(!event||event.kind!=="treasure")return event;
  if(!Number.isInteger(day)||day<1)throw new RangeError("day must be >= 1");
  if(!Number.isInteger(index)||index<0||index>7)throw new RangeError("index must be 0..7");
  if(event.chest_tier&&Number.isInteger(event.chest_seed))return event;
  const rng=new RubyMT19937Random(seedFor(day,index)&0x7fffffff);
  return {...event,chest_tier:event.chest_tier??weightedPick(TIER_WEIGHTS,rng),chest_seed:Number.isInteger(event.chest_seed)?event.chest_seed:(rng.randInt(0x7fffffff)&0x7fffffff),chest_generated_day:Number.isInteger(event.chest_generated_day)?event.chest_generated_day:day};
}

export function safariTreasureRewardV108(event,day){
  if(!event?.chest_tier||!Number.isInteger(event.chest_seed))throw new Error("prepared treasure event is required");
  const config=TIER_CONFIG[event.chest_tier];if(!config)throw new RangeError("unknown treasure tier");
  const scale=scaling(day),quality=scale+config.qualityBonus,rng=new RubyMT19937Random(event.chest_seed&0x7fffffff);
  const rolls=Math.min(config.maxRolls,Math.max(1,config.baseRolls+Math.floor(scale/config.rollStep)));
  const items=new Map();
  for(let i=0;i<rolls;i+=1){
    const minimum=i===rolls-1?config.guaranteedRarity:0;
    let pool=REWARD_ENTRIES.filter(e=>e.minQuality<=quality&&e.rarity>=minimum);
    if(pool.length===0)pool=REWARD_ENTRIES.filter(e=>e.minQuality<=quality);
    const entry=weightedPick(pool,rng);if(!entry)continue;
    const qty=Math.min(entry.maxQty,Math.max(1,entry.baseQty+Math.floor(scale/Math.max(1,entry.qtyStep))));
    items.set(entry.id,(items.get(entry.id)??0)+qty);
  }
  return {tier:event.chest_tier,tierName:config.name,day:Math.max(1,Number(day)||1),scalingValue:scale,quality,rolls,money:config.moneyBase+config.moneyPerScaling*scale,items:[...items].map(([itemId,quantity])=>({itemId,quantity}))};
}

function canGrantBag(runtime,reward){
  const clone=(runtime.bag?.slots??[]).map(s=>s?[s[0],s[1]]:null);const maxSlots=Number(runtime.bag?.max_slots??runtime.bag?.maxSlots??999);const maxPer=Number(runtime.bag?.max_per_slot??runtime.bag?.maxPerSlot??999);
  return reward.items.every(({itemId,quantity})=>add(clone,maxSlots,maxPer,itemId,quantity));
}
function grant(runtime,reward){
  if(!canGrantBag(runtime,reward))return false;
  const slots=runtime.bag.slots??(runtime.bag.slots=[]),maxSlots=Number(runtime.bag?.max_slots??runtime.bag?.maxSlots??999),maxPer=Number(runtime.bag?.max_per_slot??runtime.bag?.maxPerSlot??999);
  for(const {itemId,quantity} of reward.items)if(!add(slots,maxSlots,maxPer,itemId,quantity))throw new Error(`treasure Bag grant failed for ${itemId}`);
  runtime.bag.money=Math.max(0,Number(runtime.bag.money??0)+reward.money);return true;
}

export function openSafariTreasureTouch(runtime,index){
  const state=stateOf(runtime);const raw=state.board_events?.[index];if(!raw||raw.kind!=="treasure")throw new Error("treasure board event is required");
  if(state.board_consumed?.[index])return {runtime,result:"already_consumed",operations:[]};
  const event=prepareSafariTreasureChestV108(raw,{day:Math.max(1,Math.trunc(Number(state.day)||1)),index});state.board_events[index]=event;state.board_revealed[index]=true;state.board_visited[index]=true;
  const name=TIER_CONFIG[event.chest_tier].name;state.notice=`${name}が置かれています。`;
  if(typeof globalThis.document!=="undefined")globalThis.__maplessNormalEventUi={runtime,boardIndex:index,eventId:"treasure_chest",title:name,message:state.notice,actions:[{id:"open",label:"宝箱を開ける"},{id:"leave",label:"立ち去る",secondary:true}]};
  return {runtime,result:"treasure_ready",boundary:"treasure",eventId:"treasure_chest",availableActions:["open","leave"],notice:state.notice,operations:[]};
}

export function resolveSafariTreasureChest(runtime,index,action){
  const state=stateOf(runtime);const event=prepareSafariTreasureChestV108(state.board_events?.[index],{day:Math.max(1,Math.trunc(Number(state.day)||1)),index});state.board_events[index]=event;state.board_revealed[index]=true;state.board_visited[index]=true;
  if(state.board_consumed?.[index])return {runtime,result:"already_consumed",completed:true,operations:[]};
  if(action==="leave"){state.notice="宝箱を開けずに立ち去りました。";return {runtime,result:"declined",completed:false,operations:[]};}
  if(action!=="open")throw new RangeError("treasure action must be open or leave");
  const reward=safariTreasureRewardV108(event,state.day);
  if(!grant(runtime,reward)){state.notice="バッグに空きがなく、宝箱の中身を受け取れませんでした。";return {runtime,result:"no_room",completed:false,reward,operations:[]};}
  state.board_consumed[index]=true;state.notice=`${reward.tierName}を開けました。`;state.last_operations=[{op:"treasure_reward",tier:reward.tier,money:reward.money,items:reward.items.map(x=>({...x}))},{op:"request_save",reason:"treasure_opened"}];
  return {runtime,result:"granted",completed:true,reward,persistenceRequested:true,notice:state.notice,operations:state.last_operations};
}

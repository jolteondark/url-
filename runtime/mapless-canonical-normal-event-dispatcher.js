import { resolveFloodedRiver, resolveBurningWagon, resolveMushroomField, resolveHotSpring } from './mapless-normal-events-a1-flow.js';
import { resolveMeteorFragment, resolveHoneyTree, resolveLostPokemon, resolveSleepingGiant } from './mapless-normal-events-a2-flow.js';
import { resolvePokemonNest, resolveBerryThief, resolvePhotographer, resolveTravelingCook } from './mapless-normal-events-a3-flow.js';
import { resolveStreetPerformer, resolveBountyPoster, resolveBountyTarget } from './mapless-normal-events-a4-flow.js';
import { resolveLostBag } from './mapless-lost-bag-flow.js';
import { resolveFakeNurse } from './mapless-fake-nurse-flow.js';
import { resolveBerryJuiceShop } from './mapless-berry-juice-shop-flow.js';
import { resolveItemCollector } from './mapless-item-collector-flow.js';
import { resolveWishingFountain } from './mapless-wishing-fountain-flow.js';
import { resolveOldStatue } from './mapless-old-statue-flow.js';
import { resolveAuctionEvent } from './mapless-auction-flow.js';
import { resolveTrainerCamp } from './mapless-trainer-camp-flow.js';
import { resolveBerryContest } from './mapless-berry-contest-flow.js';
import { resolveEvolutionLab } from './mapless-evolution-lab-flow.js';
import { resolveTreasureMapSeller, resolveTreasureMapResult } from './mapless-treasure-map-flow.js';
import { resolveCrumblingBridge } from './mapless-crumbling-bridge-flow.js';

export const CANONICAL_NORMAL_EVENT_IDS = Object.freeze([
  'flooded_river','burning_wagon','mushroom_field','hot_spring',
  'meteor_fragment','honey_tree','lost_pokemon','sleeping_giant',
  'pokemon_nest','berry_thief','photographer','traveling_cook',
  'street_performer','lost_bag','fake_nurse','berry_juice_shop',
  'item_collector','wishing_fountain','old_statue','auction',
  'trainer_camp','berry_contest','evolution_lab','treasure_map_seller',
  'bounty_poster','crumbling_bridge','treasure_map_result','bounty_target'
]);
export const CANONICAL_NORMAL_EVENT_SPECIAL_IDS = Object.freeze(['treasure_map_result','bounty_target']);
export const CANONICAL_NORMAL_EVENT_SELECTABLE_IDS = Object.freeze(CANONICAL_NORMAL_EVENT_IDS.filter(id => !CANONICAL_NORMAL_EVENT_SPECIAL_IDS.includes(id)));

const DIRECT = Object.freeze({
  flooded_river: resolveFloodedRiver, burning_wagon: resolveBurningWagon, mushroom_field: resolveMushroomField, hot_spring: resolveHotSpring,
  meteor_fragment: resolveMeteorFragment, honey_tree: resolveHoneyTree, lost_pokemon: resolveLostPokemon, sleeping_giant: resolveSleepingGiant,
  pokemon_nest: resolvePokemonNest, berry_thief: resolveBerryThief, photographer: resolvePhotographer, traveling_cook: resolveTravelingCook,
  street_performer: resolveStreetPerformer, lost_bag: resolveLostBag, fake_nurse: resolveFakeNurse, berry_juice_shop: resolveBerryJuiceShop,
  item_collector: resolveItemCollector, wishing_fountain: resolveWishingFountain, old_statue: resolveOldStatue, trainer_camp: resolveTrainerCamp,
  berry_contest: resolveBerryContest, evolution_lab: resolveEvolutionLab, bounty_poster: resolveBountyPoster, crumbling_bridge: resolveCrumblingBridge, bounty_target: resolveBountyTarget
});
function cloneEvent(source = {}) { return { ...source, normal_data: { ...(source.normal_data || {}) } }; }
function normalizeLegacyResult(eventId, input, raw) {
  if (raw?.event) return { ...raw, event_id: eventId };
  const event = cloneEvent(input.event || {}); const operations = Array.isArray(raw?.operations) ? [...raw.operations] : [];
  const completed = raw?.result === true || raw?.result?.completed === true || raw?.result?.left === true || operations.some(x => x?.op === 'finish_event');
  if (completed) event.normal_resolved = true;
  return { ...raw, event, operations, result: completed, event_id: eventId, legacy_result: raw?.result };
}
export function hasCanonicalNormalEvent(eventId) { return CANONICAL_NORMAL_EVENT_IDS.includes(eventId); }
export function resolveCanonicalNormalEvent(eventId, input = {}) {
  if (!hasCanonicalNormalEvent(eventId)) return { event_id: eventId, event: cloneEvent(input.event || {}), operations: [], result: false, outcome: 'unsupported_event' };
  if (eventId === 'auction') return normalizeLegacyResult(eventId, input, resolveAuctionEvent({ ...input, data: input.data ?? input.event?.normal_data ?? { products: [], won: false } }));
  if (eventId === 'treasure_map_seller') return normalizeLegacyResult(eventId, input, resolveTreasureMapSeller(input));
  if (eventId === 'treasure_map_result') return normalizeLegacyResult(eventId, input, resolveTreasureMapResult(input));
  const handler = DIRECT[eventId]; if (!handler) throw new Error(`canonical normal event handler missing: ${eventId}`); return { ...handler(input), event_id: eventId };
}
export function canonicalNormalEventRegistry() { return CANONICAL_NORMAL_EVENT_IDS.map((id, index) => ({ id, index, selectable: !CANONICAL_NORMAL_EVENT_SPECIAL_IDS.includes(id), special: CANONICAL_NORMAL_EVENT_SPECIAL_IDS.includes(id) })); }

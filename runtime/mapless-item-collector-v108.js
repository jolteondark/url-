import { resolveItemCollector } from "./mapless-item-collector-flow.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const MAPLESS_ITEM_COLLECTOR_BALL_GRADES_V108 = Object.freeze([
  Object.freeze(["POKEBALL", "PREMIERBALL"]),
  Object.freeze(["GREATBALL", "HEALBALL", "NETBALL", "NESTBALL", "REPEATBALL", "DIVEBALL"]),
  Object.freeze(["ULTRABALL", "QUICKBALL", "DUSKBALL", "TIMERBALL"]),
  Object.freeze(["FASTBALL", "LEVELBALL", "LUREBALL", "HEAVYBALL", "LOVEBALL", "FRIENDBALL", "MOONBALL", "DREAMBALL"]),
]);

export const MAPLESS_ITEM_COLLECTOR_MEDICINE_GRADES_V108 = Object.freeze([
  Object.freeze(["POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL"]),
  Object.freeze(["SUPERPOTION", "FULLHEAL", "FRESHWATER", "SODAPOP"]),
  Object.freeze(["HYPERPOTION", "LEMONADE", "MOOMOOMILK", "ETHER"]),
  Object.freeze(["MAXPOTION", "FULLRESTORE", "MAXETHER", "ELIXIR"]),
]);

export function itemCollectorGradePoolsV108(category, itemExists = () => true) {
  const source = category === "ball"
    ? MAPLESS_ITEM_COLLECTOR_BALL_GRADES_V108
    : category === "medicine"
      ? MAPLESS_ITEM_COLLECTOR_MEDICINE_GRADES_V108
      : [];
  return source.map((grade) => grade.filter((id) => itemExists(id)));
}

export function itemCollectorOwnedEntriesV108(category, itemExists, quantityOf) {
  return itemCollectorGradePoolsV108(category, itemExists).flatMap((grade, gradeIndex) =>
    grade.map((id) => ({ id, qty: Number(quantityOf(id) || 0), grade: gradeIndex }))
      .filter((entry) => entry.qty > 0));
}

export function resolveCanonicalItemCollectorV108(input = {}) {
  const choice = input.choice;
  if (choice === "leave" || !["ball", "medicine"].includes(choice)) {
    return resolveItemCollector({ event: input.event, choice });
  }
  if (typeof input.item_exists !== "function") throw new TypeError("item_exists must be a function");
  if (typeof input.quantity_of !== "function") throw new TypeError("quantity_of must be a function");

  const seed = Number(input.event?.normal_seed);
  if (!Number.isInteger(seed)) throw new TypeError("event.normal_seed must be an integer");
  const pools = itemCollectorGradePoolsV108(choice, input.item_exists);
  const entries = itemCollectorOwnedEntriesV108(choice, input.item_exists, input.quantity_of);
  const rng = new RubyMT19937Random(seed >>> 0);

  return resolveItemCollector({
    event: input.event,
    choice,
    entries,
    grade_candidates: pools,
    selected_item: input.selected_item,
    random_int: (limit) => rng.randInt(limit),
    can_add_result: input.can_add_result,
    remove_item_result: input.remove_item_result,
    grant_item_result: input.grant_item_result,
  });
}

import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const MAPLESS_EVOLUTION_LAB_PART_ITEMS_V108 = Object.freeze([
  "FIRESTONE", "THUNDERSTONE", "WATERSTONE", "LEAFSTONE", "MOONSTONE",
  "SUNSTONE", "SHINYSTONE", "DUSKSTONE", "DAWNSTONE", "ICESTONE",
  "METALCOAT", "UPGRADE", "DUBIOUSDISC", "NUGGET", "STARPIECE",
]);

function cloneEvent(event = {}) {
  return { ...event, normal_data:{ ...(event.normal_data || {}) } };
}

function normalizedEligible(entries = []) {
  return Array.isArray(entries) ? entries.map((entry, index) => ({
    index:Number.isInteger(entry?.index) ? entry.index : index,
    id:entry?.id ?? null,
    name:String(entry?.name ?? entry?.id ?? `Pokemon ${index + 1}`),
    evolutions:Array.isArray(entry?.evolutions) ? [...new Set(entry.evolutions.filter(Boolean).map(String))] : [],
  })).filter((entry) => entry.evolutions.length > 0) : [];
}

/**
 * Canonical v0.9.108 Evolution Lab decision owner.
 *
 * This module deliberately does not mutate Safari Pokemon/Bag state. It owns the
 * canonical choice/RNG/result contract and emits mutation intents for the existing
 * Bag/Pokemon Runtime owners to commit.
 */
export function resolveCanonicalEvolutionLabV108(input = {}) {
  const event = cloneEvent(input.event || {});
  const operations = [{ op:"present_choices", choices:["stable", "maximum", "parts", "leave"] }];
  const choice = String(input.choice ?? "");
  const pending = (outcome) => ({ event, operations, result:false, outcome, completed:false });
  const finish = (outcome) => {
    event.normal_resolved = true;
    operations.push({ op:"finish_event" });
    return { event, operations, result:true, outcome, completed:true };
  };

  if (!choice) return pending("choice_required");
  if (choice === "leave") {
    operations.push({ op:"leave_event" });
    return finish("left");
  }

  if (choice === "parts") {
    const itemExists = typeof input.item_exists === "function" ? input.item_exists : (() => true);
    const pool = MAPLESS_EVOLUTION_LAB_PART_ITEMS_V108.filter((item) => itemExists(item));
    operations.push({ op:"parts_pool", items:[...pool] });
    if (!pool.length) return finish("parts_empty");
    if (typeof input.random_int !== "function") return pending("parts_rng_required");
    const index = Number(input.random_int(pool.length));
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) throw new RangeError("random_int returned an invalid parts index");
    const item = pool[index];
    operations.push({ op:"grant_item", item, quantity:1 });
    return { ...finish("parts_recovered"), rewardItem:item };
  }

  if (choice !== "stable" && choice !== "maximum") return pending("cancelled");

  const eligible = normalizedEligible(input.eligible_pokemon);
  operations.push({ op:"eligible_pokemon", entries:eligible.map((entry) => ({ ...entry, evolutions:[...entry.evolutions] })) });
  if (!eligible.length) return pending("no_eligible_pokemon");

  const selectedIndex = Number(input.selected_index);
  if (!Number.isInteger(selectedIndex)) return pending("pokemon_selection_required");
  const selected = eligible.find((entry) => entry.index === selectedIndex);
  if (!selected) return pending("selected_pokemon_unavailable");

  let species = selected.evolutions[0];
  if (selected.evolutions.length > 1) {
    if (!input.selected_species) return pending("evolution_selection_required");
    species = String(input.selected_species);
    if (!selected.evolutions.includes(species)) return pending("selected_evolution_unavailable");
  }
  operations.push({ op:"selected_evolution", pokemon_index:selected.index, species });

  const seed = Number(event.normal_seed);
  if (!Number.isInteger(seed)) throw new TypeError("event.normal_seed must be an integer");
  const roll = new RubyMT19937Random(seed >>> 0).randInt(100);
  operations.push({ op:"evolution_lab_roll", value:roll, mode:choice });

  if (choice === "stable") {
    if (roll < 45) operations.push({ op:"force_evolve", pokemon_index:selected.index, species });
    else operations.push({ op:"evolution_no_change", pokemon_index:selected.index });
    return { ...finish(roll < 45 ? "evolved" : "stable_no_change"), roll, pokemonIndex:selected.index, species };
  }

  if (roll < 80) {
    operations.push({ op:"force_evolve", pokemon_index:selected.index, species });
    return { ...finish("evolved"), roll, pokemonIndex:selected.index, species };
  }
  const levels = roll < 95 ? 1 : 3;
  operations.push({ op:"lower_level", pokemon_index:selected.index, levels, minimum_level:1, recalculate_stats:true });
  return { ...finish(levels === 1 ? "level_down_1" : "level_down_3"), roll, pokemonIndex:selected.index, species, levels };
}

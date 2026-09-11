import assert from "node:assert/strict";
import { resolveCanonicalEvolutionLabV108, MAPLESS_EVOLUTION_LAB_PART_ITEMS_V108 } from "../runtime/mapless-evolution-lab-v108.js";

function event(seed = 1) { return { kind:"normal_event", normal_event_id:"evolution_lab", normal_seed:seed, normal_data:{} }; }

{
  const owner = resolveCanonicalEvolutionLabV108({ event:event(7), choice:"leave" });
  assert.equal(owner.outcome, "left");
  assert.equal(owner.event.normal_resolved, true);
  assert.equal(owner.operations.at(-1).op, "finish_event");
}

{
  const owner = resolveCanonicalEvolutionLabV108({
    event:event(7),
    choice:"parts",
    item_exists:(id) => ["FIRESTONE", "METALCOAT"].includes(id),
    random_int:(limit) => limit - 1,
  });
  assert.equal(owner.outcome, "parts_recovered");
  assert.equal(owner.rewardItem, "METALCOAT");
  assert(owner.operations.some((op) => op.op === "grant_item" && op.item === "METALCOAT"));
  assert.equal(owner.event.normal_resolved, true);
}

{
  const owner = resolveCanonicalEvolutionLabV108({ event:event(7), choice:"parts", item_exists:() => true });
  assert.equal(owner.outcome, "parts_rng_required");
  assert.equal(owner.event.normal_resolved, undefined);
}

{
  const owner = resolveCanonicalEvolutionLabV108({ event:event(7), choice:"stable", eligible_pokemon:[] });
  assert.equal(owner.outcome, "no_eligible_pokemon");
  assert.equal(owner.event.normal_resolved, undefined);
}

{
  let stableSeed = null;
  let stableRoll = null;
  for (let seed = 0; seed < 10000; seed += 1) {
    const owner = resolveCanonicalEvolutionLabV108({
      event:event(seed), choice:"stable", selected_index:0,
      eligible_pokemon:[{ index:0, id:"PIKACHU", name:"Pikachu", evolutions:["RAICHU"] }],
    });
    if (owner.roll < 45) { stableSeed = seed; stableRoll = owner.roll; break; }
  }
  assert.notEqual(stableSeed, null);
  const owner = resolveCanonicalEvolutionLabV108({
    event:event(stableSeed), choice:"stable", selected_index:0,
    eligible_pokemon:[{ index:0, id:"PIKACHU", name:"Pikachu", evolutions:["RAICHU"] }],
  });
  assert.equal(owner.roll, stableRoll);
  assert(owner.operations.some((op) => op.op === "force_evolve" && op.species === "RAICHU"));
}

{
  const outcomes = new Set();
  for (let seed = 0; seed < 10000 && outcomes.size < 3; seed += 1) {
    const owner = resolveCanonicalEvolutionLabV108({
      event:event(seed), choice:"maximum", selected_index:0,
      eligible_pokemon:[{ index:0, id:"EEVEE", name:"Eevee", evolutions:["VAPOREON", "JOLTEON"] }],
      selected_species:"JOLTEON",
    });
    outcomes.add(owner.outcome);
    if (owner.outcome === "evolved") assert(owner.roll < 80);
    if (owner.outcome === "level_down_1") assert(owner.roll >= 80 && owner.roll < 95);
    if (owner.outcome === "level_down_3") assert(owner.roll >= 95);
  }
  assert.deepEqual(outcomes, new Set(["evolved", "level_down_1", "level_down_3"]));
}

assert.deepEqual(MAPLESS_EVOLUTION_LAB_PART_ITEMS_V108.slice(0, 10), [
  "FIRESTONE", "THUNDERSTONE", "WATERSTONE", "LEAFSTONE", "MOONSTONE",
  "SUNSTONE", "SHINYSTONE", "DUSKSTONE", "DAWNSTONE", "ICESTONE",
]);

console.log("evolution_lab v0.9.108 owner smoke: ok");

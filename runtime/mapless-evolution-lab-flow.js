function cloneEvent(event = {}) {
  return { ...event, normal_data: { ...(event.normal_data || {}) } };
}

export function resolveEvolutionLab(input = {}) {
  const event = cloneEvent(input.event || {});
  const operations = [];
  const choice = input.choice;
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];
  const finish = (outcome) => { event.normal_resolved = true; operations.push({ op: "finish_event" }); return { event, operations, result: true, outcome }; };
  const pending = (outcome) => ({ event, operations, result: false, outcome });
  operations.push({ op: "present_choices", choices: ["stable", "maximum", "parts", "leave"] });
  if (!["stable", "maximum", "parts", "leave"].includes(choice)) return pending("cancelled");
  if (choice === "leave") { operations.push({ op: "leave_event" }); return finish("left"); }
  if (choice === "parts") { if (input.reward_item) operations.push({ op: "grant_item", item: input.reward_item, quantity: 1 }); operations.push({ op: "disable_machine" }); return finish("parts_recovered"); }
  operations.push({ op: "evolution_candidates", candidates });
  if (candidates.length === 0) return pending("no_evolution_candidates");
  const selectedIndex = Number.isInteger(input.selected_party_index) ? input.selected_party_index : null;
  if (selectedIndex === null) return pending("pokemon_selection_cancelled");
  const pokemon = candidates.find((p) => Number(p.party_index) === selectedIndex);
  if (!pokemon) return pending("pokemon_selection_unavailable");
  const evolutions = Array.isArray(pokemon.evolution_choices) ? pokemon.evolution_choices.filter(Boolean) : [];
  if (evolutions.length === 0) return pending("no_evolution_choices");
  let species = evolutions[0];
  if (evolutions.length > 1) { if (!input.selected_evolution) return pending("evolution_selection_cancelled"); if (!evolutions.includes(input.selected_evolution)) return pending("evolution_selection_unavailable"); species = input.selected_evolution; }
  operations.push({ op: "select_pokemon", party_index: selectedIndex, species: pokemon.species || null, evolution: species });
  const roll = Number.parseInt(input.roll, 10); const resolvedRoll = Number.isFinite(roll) ? roll : 100;
  operations.push({ op: "evolution_roll", value: resolvedRoll, mode: choice });
  if (choice === "stable") { if (resolvedRoll < 45) { operations.push({ op: "force_evolve", party_index: selectedIndex, species }); return finish("stable_evolution"); } operations.push({ op: "stable_shutdown" }); return finish("stable_no_evolution"); }
  operations.push({ op: "maximum_output" });
  if (resolvedRoll < 80) { operations.push({ op: "force_evolve", party_index: selectedIndex, species }); return finish("maximum_evolution"); }
  const amount = resolvedRoll < 95 ? 1 : 3; operations.push({ op: "lower_level", party_index: selectedIndex, amount, minimum_level: 1 });
  return finish(amount === 1 ? "maximum_level_down_1" : "maximum_level_down_3");
}

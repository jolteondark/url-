// Canonical Mapless v0.9.108 normal-event evolution-choice semantics.
// Source: MaplessNormalEvents.evolution_choices in the frozen v0.9.108 core.
// This adapter filters source-owned evolution rows only; it does not invent
// evolution conditions or mutate Pokemon state.

function normalizeGender(value) {
  const gender = String(value || "").trim().toLowerCase();
  if (gender === "male" || gender === "m") return "male";
  if (gender === "female" || gender === "f") return "female";
  return null;
}

function readTarget(row) {
  if (Array.isArray(row)) return row[0] ?? null;
  return row?.target ?? row?.species ?? row?.species_id ?? row?.speciesId ?? null;
}

function readMethod(row) {
  if (Array.isArray(row)) return row[1] ?? "";
  return row?.method ?? row?.evolution_method ?? row?.evolutionMethod ?? "";
}

export function filterMaplessV108EvolutionChoices(evolutions, options = {}) {
  const gender = normalizeGender(options.gender);
  const speciesExists = typeof options.speciesExists === "function"
    ? options.speciesExists
    : () => true;
  const seen = new Set();
  const choices = [];

  for (const row of Array.isArray(evolutions) ? evolutions : []) {
    const target = readTarget(row);
    if (!target) continue;
    const method = String(readMethod(row) || "");
    if (method.includes("Male") && gender !== "male") continue;
    if (method.includes("Female") && gender !== "female") continue;
    if (!speciesExists(target) || seen.has(target)) continue;
    seen.add(target);
    choices.push(target);
  }
  return choices;
}

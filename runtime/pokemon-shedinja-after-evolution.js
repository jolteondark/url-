import { quantity, remove } from "./bag-economy-mart-flow.js";
import { levelFromExp } from "./pokemon-growth-rate.js";
import { pokemonMoveTotalPp } from "./pokemon-runtime.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";

function normalizeEvolution(entry) {
  if (Array.isArray(entry)) {
    const [species, method, parameter, prevolution = false] = entry;
    return { species: String(species ?? ""), method: String(method ?? ""), parameter, prevolution: prevolution === true };
  }
  if (!entry || typeof entry !== "object") return null;
  return {
    species: String(entry.species ?? entry.target ?? entry.id ?? ""),
    method: String(entry.method ?? entry.type ?? ""),
    parameter: entry.parameter ?? entry.param ?? entry.level,
    prevolution: (entry.prevolution ?? entry.is_prevolution ?? entry.prevo) === true,
  };
}

function canonicalSpeciesForm(runtime, speciesMaster) {
  const defaultForm = Number(speciesMaster?.default_form ?? speciesMaster?.defaultForm);
  if (Number.isInteger(defaultForm) && defaultForm >= 0) return defaultForm;
  const targetForm = Number(speciesMaster?.form);
  if (Number.isInteger(targetForm) && targetForm > 0) return targetForm;
  const currentForm = Number(runtime?.form);
  return Number.isInteger(currentForm) && currentForm >= 0 ? currentForm : 0;
}

function canonicalSpeciesLevel(runtime, speciesMaster) {
  const exp = Number(runtime?.exp);
  const growthRate = speciesMaster?.growth_rate ?? speciesMaster?.growthRate;
  if (!growthRate || !Number.isInteger(exp) || exp < 0) return Number(runtime?.level);
  return levelFromExp(growthRate, exp);
}

function canonicalAbility(runtime, speciesMaster) {
  const natural = Array.isArray(speciesMaster?.abilities) ? speciesMaster.abilities : [];
  const hidden = Array.isArray(speciesMaster?.hidden_abilities) ? speciesMaster.hidden_abilities : [];
  let abilityIndex = Number(runtime?.ability_index);
  if (!Number.isInteger(abilityIndex) || abilityIndex < 0) {
    const personalId = Number(runtime?.personal_id);
    abilityIndex = Number.isInteger(personalId) ? (personalId & 1) : 0;
  }
  let ability = abilityIndex >= 2 ? hidden[abilityIndex - 2] ?? null : natural[abilityIndex] ?? null;
  if (!ability) {
    const personalId = Number(runtime?.personal_id);
    const fallbackIndex = Number.isInteger(personalId) ? (personalId & 1) : 0;
    ability = natural[fallbackIndex] ?? natural[0] ?? null;
  }
  return { abilityIndex, ability: ability == null ? null : String(ability) };
}

function canonicalGender(runtime, speciesMaster) {
  const ratio = String(speciesMaster?.gender_ratio ?? speciesMaster?.gender_ratio_id ?? "")
    .replace(/^:/, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (ratio === "ALWAYSMALE") return 0;
  if (ratio === "ALWAYSFEMALE") return 1;
  if (ratio === "GENDERLESS") return 2;
  return runtime?.gender;
}

function duplicateShedinjaRuntime(source, targetMaster, natureMaster, moveMasters) {
  const { abilityIndex, ability } = canonicalAbility(source, targetMaster);
  const duplicateInput = {
    ...structuredClone(source),
    species: targetMaster.id,
    form: canonicalSpeciesForm(source, targetMaster),
    forced_form: null,
    level: canonicalSpeciesLevel(source, targetMaster),
    name: null,
    nickname: null,
    markings: [],
    poke_ball: "POKEBALL",
    item: null,
    held_item: null,
    ribbons: [],
    ability_index: abilityIndex,
    ability,
    ability_id: ability,
    gender: canonicalGender(source, targetMaster),
  };
  let duplicate = resolvePokemonRuntimeMasters(duplicateInput, {
    species_master: targetMaster,
    nature_master: natureMaster,
    move_masters: moveMasters,
  });
  const healedMoves = (duplicate.moves ?? []).map((move) => {
    const master = moveMasters?.[move.id];
    if (!master) throw new RangeError(`Shedinja move is outside the projection: ${move.id}`);
    return { ...move, pp: pokemonMoveTotalPp(master.total_pp, move.ppup ?? 0) };
  });
  duplicate = {
    ...duplicate,
    ability,
    held_item: null,
    hp: duplicate.max_hp,
    status: null,
    status_count: 0,
    moves: healedMoves,
  };
  return duplicate;
}

export function applyShedinjaAfterEvolution({
  sourcePokemon,
  sourceSpeciesMaster,
  speciesMasters,
  natureMaster,
  moveMasters,
  party,
  bagSlots,
  maxParty = 6,
} = {}) {
  const shedinjaEntry = (sourceSpeciesMaster?.evolutions ?? [])
    .map(normalizeEvolution)
    .find((entry) => entry?.species && !entry.prevolution && entry.method === "Shedinja") ?? null;
  if (!shedinjaEntry) return { duplicated: false, pokemon: null, operations: [] };
  if (!Array.isArray(party) || party.length >= maxParty) return { duplicated: false, pokemon: null, operations: [] };
  if (!Array.isArray(bagSlots) || quantity(bagSlots, "POKEBALL") < 1) return { duplicated: false, pokemon: null, operations: [] };

  const targetMaster = speciesMasters?.[shedinjaEntry.species];
  if (!targetMaster) throw new RangeError(`Shedinja target species is outside the projection: ${shedinjaEntry.species}`);
  const duplicate = duplicateShedinjaRuntime(sourcePokemon, targetMaster, natureMaster, moveMasters);
  if (!remove(bagSlots, "POKEBALL", 1)) throw new Error("failed to consume Poké Ball for Shedinja duplication");
  party.push(duplicate);
  return {
    duplicated: true,
    pokemon: duplicate,
    operations: [
      { op: "shedinja_duplicate", species: duplicate.species, source_species: sourcePokemon?.species ?? null },
      { op: "remove_item", item: "POKEBALL", quantity: 1, reason: "shedinja_evolution" },
    ],
  };
}

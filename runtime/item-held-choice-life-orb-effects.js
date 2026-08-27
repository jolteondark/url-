export const CHOICE_LIFE_ORB_SOURCE = Object.freeze({
  canonical: "Mapless v0.9.108 / Pokémon Essentials v21.1 Battle item handlers",
  mechanicsGeneration: 9,
  choiceMultiplier: 1.5,
  lifeOrbMultiplier: 1.3,
  lifeOrbRecoilFraction: Object.freeze([1, 10]),
});

export const CHOICE_ITEM_IDS = Object.freeze(["CHOICEBAND", "CHOICESPECS", "CHOICESCARF"]);

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function abilityId(pokemon) {
  return id(hasOwn(pokemon, "ability") ? pokemon.ability : pokemon?.ability_id);
}

function itemId(pokemon) {
  return id(hasOwn(pokemon, "held_item") ? pokemon.held_item : pokemon?.item);
}

function pokemonHasMove(pokemon, moveId) {
  const wanted = id(moveId);
  return wanted && (Array.isArray(pokemon?.moves) ? pokemon.moves : []).some((move) => id(typeof move === "string" ? move : move?.id) === wanted);
}

export function activeChoiceSourceCanonical(pokemon = {}) {
  const ability = abilityId(pokemon);
  if (ability === "GORILLATACTICS") return "GORILLATACTICS";
  if (ability === "KLUTZ") return null;
  const item = itemId(pokemon);
  return CHOICE_ITEM_IDS.includes(item) ? item : null;
}

export function resolveChoiceSelectionCanonical({ pokemon = {}, selectedMoveId = null, lockedMoveId = null } = {}) {
  const source = activeChoiceSourceCanonical(pokemon);
  const selected = id(selectedMoveId) || null;
  let locked = id(lockedMoveId) || null;
  if (locked && !pokemonHasMove(pokemon, locked)) locked = null;
  if (!source) {
    return Object.freeze({ active: false, allowed: true, source: null, selectedMoveId: selected, lockedMoveId: locked });
  }
  if (selected && locked && selected !== locked) {
    return Object.freeze({
      active: true,
      allowed: false,
      source,
      selectedMoveId: selected,
      lockedMoveId: locked,
      reason: "choice_lock",
    });
  }
  return Object.freeze({
    active: true,
    allowed: true,
    source,
    selectedMoveId: selected,
    lockedMoveId: locked ?? selected,
  });
}

export function assertChoiceSelectionCanonical(input = {}) {
  const resolution = resolveChoiceSelectionCanonical(input);
  if (!resolution.allowed) {
    throw new RangeError(`${resolution.source} only allows ${resolution.lockedMoveId}`);
  }
  return resolution;
}

export function battlerUsedMoveInResolvedRound(resolved, battlerIndex, moveId) {
  const wanted = id(moveId);
  if (!wanted || wanted === "STRUGGLE") return false;
  const rounds = resolved?.battleRuntimeIntegration?.combatTrace?.rounds ?? [];
  for (const round of rounds) {
    for (const action of round?.actions ?? []) {
      if (Number(action?.battlerIndex) !== Number(battlerIndex)) continue;
      if (id(action?.moveId) !== wanted) continue;
      if (action?.moveSkipped === true) return false;
      return true;
    }
  }
  return false;
}

export function updateChoiceLockAfterResolvedRound({
  battle,
  pokemon,
  selectedMoveId,
  resolved,
  battlerIndex,
  stateKey,
} = {}) {
  if (!battle || !stateKey) throw new TypeError("battle and stateKey are required");
  let locked = id(battle[stateKey]) || null;
  if (locked && !pokemonHasMove(pokemon, locked)) {
    battle[stateKey] = null;
    locked = null;
  }
  const source = activeChoiceSourceCanonical(pokemon);
  if (!source || locked || !battlerUsedMoveInResolvedRound(resolved, battlerIndex, selectedMoveId)) {
    return Object.freeze({ source, lockedMoveId: locked, changed: false });
  }
  battle[stateKey] = id(selectedMoveId);
  return Object.freeze({ source, lockedMoveId: battle[stateKey], changed: true });
}

export function clearChoiceLockCanonical(battle, stateKey) {
  if (!battle || !stateKey) throw new TypeError("battle and stateKey are required");
  battle[stateKey] = null;
}

function clone(value) {
  if (value == null || typeof value !== "object") return value;
  return Array.isArray(value)
    ? value.map(clone)
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

function normalizeActiveIndex(party, requestedIndex) {
  if (!Array.isArray(party) || party.length === 0) return -1;
  const parsed = Number(requestedIndex);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed < party.length && party[parsed] != null) return parsed;
  return party.findIndex((pokemon) => pokemon != null);
}

function normalizeActiveState(value) {
  value.active_index = normalizeActiveIndex(value.party, value.active_index);
  return value;
}

function stateOf(input) {
  if (!input || typeof input !== "object") throw new TypeError("state is required");
  return normalizeActiveState({
    ...clone(input),
    party: Array.isArray(input.party) ? input.party.map(clone) : [],
    boxes: Array.isArray(input.boxes)
      ? input.boxes.map((box) => ({ ...clone(box), slots: Array.isArray(box?.slots) ? box.slots.map(clone) : [] }))
      : [],
  });
}

function capacity(value, fallback, field) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return parsed;
}

export function pokemonEgg(pokemon) {
  return Boolean(pokemon) && Number(pokemon.steps_to_hatch ?? 0) > 0;
}

export function pokemonFainted(pokemon) {
  return Boolean(pokemon) && !pokemonEgg(pokemon) && Number(pokemon.hp ?? 0) <= 0;
}

export function pokemonAble(pokemon) {
  return Boolean(pokemon) && !pokemonEgg(pokemon) && Number(pokemon.hp ?? 0) > 0;
}

export function activeParty(state) {
  return stateOf(state).party.filter((pokemon) => pokemonAble(pokemon));
}

export function activePartyIndex(state) {
  return stateOf(state).active_index;
}

export function activePokemon(state) {
  const value = stateOf(state);
  return value.active_index < 0 ? null : value.party[value.active_index] ?? null;
}

export function ablePokemonCount(state) {
  return activeParty(state).length;
}

export function allFainted(state) {
  return ablePokemonCount(state) === 0;
}

function activeIndexAfterRemoval(activeIndex, removedIndex, newLength) {
  if (newLength <= 0) return -1;
  if (activeIndex > removedIndex) return activeIndex - 1;
  if (activeIndex === removedIndex) return Math.min(removedIndex, newLength - 1);
  return activeIndex;
}

export function removePokemonAtIndex(state, index) {
  const value = stateOf(state);
  if (!Number.isInteger(index) || index < 0 || index >= value.party.length) {
    return { result: false, state: value, operations: [{ op: "remove_rejected", reason: "index" }] };
  }
  const hasOtherAble = value.party.some((pokemon, i) => i !== index && pokemonAble(pokemon));
  if (!hasOtherAble) {
    return { result: false, state: value, operations: [{ op: "remove_rejected", reason: "last_able" }] };
  }
  const activeIndex = value.active_index;
  value.party.splice(index, 1);
  value.active_index = activeIndexAfterRemoval(activeIndex, index, value.party.length);
  normalizeActiveState(value);
  return { result: true, state: value, operations: [{ op: "remove_party", index }] };
}

function maxPokemon(value, box, maxPartySize, defaultBoxCapacity) {
  if (box < 0) return maxPartySize;
  if (box >= value.boxes.length) return 0;
  return capacity(value.boxes[box].capacity, defaultBoxCapacity, "box capacity");
}

function getPokemon(value, box, index) {
  return box < 0 ? value.party[index] : value.boxes[box]?.slots[index];
}

function setPokemon(value, box, index, pokemon) {
  if (box < 0) {
    value.party[index] = clone(pokemon);
    return;
  }
  const slots = value.boxes[box].slots.slice();
  while (slots.length <= index) slots.push(null);
  slots[index] = clone(pokemon);
  value.boxes[box] = { ...value.boxes[box], slots };
}

function firstFree(value, box, maxPartySize, defaultBoxCapacity) {
  if (box < 0) return value.party.length >= maxPartySize ? -1 : value.party.length;
  const maximum = maxPokemon(value, box, maxPartySize, defaultBoxCapacity);
  for (let i = 0; i < maximum; i += 1) if (getPokemon(value, box, i) == null) return i;
  return -1;
}

function sourceRejectionReason(value, box, index, maxPartySize, defaultBoxCapacity) {
  if (!Number.isInteger(box) || box < -1 || box >= value.boxes.length) return "source_box";
  if (!Number.isInteger(index) || index < 0) return "source_index";
  if (box < 0) return index < value.party.length ? null : "source_index";
  return index < maxPokemon(value, box, maxPartySize, defaultBoxCapacity) ? null : "source_index";
}

export function deleteStoredPokemon(state, box, index) {
  const value = stateOf(state);
  const sourceReason = sourceRejectionReason(value, box, index, 6, 30);
  if (sourceReason) {
    return { result: false, state: value, operations: [{ op: "delete_rejected", reason: sourceReason }] };
  }
  if (getPokemon(value, box, index) != null) {
    if (box < 0) {
      const activeIndex = value.active_index;
      value.party.splice(index, 1);
      value.active_index = activeIndexAfterRemoval(activeIndex, index, value.party.length);
      normalizeActiveState(value);
    } else {
      setPokemon(value, box, index, null);
    }
  }
  return { result: true, state: value, operations: [{ op: "delete", box, index }] };
}

export function copyStoredPokemon(state, {
  boxDst,
  indexDst = -1,
  boxSrc,
  indexSrc,
  maxPartySize = 6,
  defaultBoxCapacity = 30,
} = {}) {
  const value = stateOf(state);
  const partyLimit = capacity(maxPartySize, 6, "maxPartySize");
  const boxLimit = capacity(defaultBoxCapacity, 30, "defaultBoxCapacity");
  if (!Number.isInteger(boxDst) || boxDst < -1 || boxDst >= value.boxes.length) {
    return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "destination_box" }] };
  }
  let destinationIndex = indexDst;
  if (!Number.isInteger(destinationIndex) || destinationIndex < -1) {
    return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "destination_index" }] };
  }
  if (destinationIndex < 0) {
    destinationIndex = firstFree(value, boxDst, partyLimit, boxLimit);
    if (destinationIndex < 0) {
      return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "no_destination" }] };
    }
  } else if (boxDst >= 0 && destinationIndex >= maxPokemon(value, boxDst, partyLimit, boxLimit)) {
    return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "destination_index" }] };
  }
  const sourceReason = sourceRejectionReason(value, boxSrc, indexSrc, partyLimit, boxLimit);
  if (sourceReason) {
    return { result: false, state: value, operations: [{ op: "copy_rejected", reason: sourceReason }] };
  }
  const pokemon = getPokemon(value, boxSrc, indexSrc);
  if (pokemon == null) throw new TypeError("Trying to copy nil to storage");
  const sameLocation = boxDst === boxSrc && destinationIndex === indexSrc;
  if (boxDst >= 0 && !sameLocation && getPokemon(value, boxDst, destinationIndex) != null) {
    return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "destination_occupied" }] };
  }
  if (boxDst < 0) {
    if (value.party.length >= partyLimit) {
      return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "party_full" }] };
    }
    value.party.push(clone(pokemon));
    value.party = value.party.filter((entry) => entry != null);
    normalizeActiveState(value);
    destinationIndex = value.party.length - 1;
  } else {
    setPokemon(value, boxDst, destinationIndex, pokemon);
  }
  return {
    result: true,
    state: value,
    destination: { box: boxDst, index: destinationIndex },
    operations: [{ op: "copy", boxDst, indexDst: destinationIndex, boxSrc, indexSrc }],
  };
}

export function moveStoredPokemon(state, options = {}) {
  const value = stateOf(state);
  const partyLimit = capacity(options.maxPartySize, 6, "maxPartySize");
  const boxLimit = capacity(options.defaultBoxCapacity, 30, "defaultBoxCapacity");
  const sourceReason = sourceRejectionReason(value, options.boxSrc, options.indexSrc, partyLimit, boxLimit);
  if (sourceReason) {
    return { result: false, state: value, operations: [{ op: "move_rejected", reason: sourceReason }] };
  }
  if (options.boxSrc < 0 && options.boxDst >= 0) {
    const sourcePokemon = getPokemon(value, options.boxSrc, options.indexSrc);
    const hasOtherAble = value.party.some((pokemon, index) => index !== options.indexSrc && pokemonAble(pokemon));
    if (pokemonAble(sourcePokemon) && !hasOtherAble) {
      return { result: false, state: value, operations: [{ op: "move_rejected", reason: "last_able" }] };
    }
  }
  const copied = copyStoredPokemon(value, options);
  if (!copied.result) return copied;
  if (copied.destination.box === options.boxSrc && copied.destination.index === options.indexSrc) {
    return {
      result: true,
      state: copied.state,
      destination: copied.destination,
      operations: [...copied.operations, { op: "move_noop", box: options.boxSrc, index: options.indexSrc }],
    };
  }
  const deleted = deleteStoredPokemon(copied.state, options.boxSrc, options.indexSrc);
  return {
    result: true,
    state: deleted.state,
    destination: copied.destination,
    operations: [...copied.operations, ...deleted.operations],
  };
}

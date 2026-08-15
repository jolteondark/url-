function clonePokemon(value) {
  if (value == null || typeof value !== "object") return value;
  return Array.isArray(value) ? value.map(clonePokemon) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clonePokemon(v)]));
}

function cloneState(input) {
  if (!input || typeof input !== "object") throw new TypeError("state is required");
  const party = Array.isArray(input.party) ? input.party.map(clonePokemon) : [];
  const boxes = Array.isArray(input.boxes) ? input.boxes.map((box) => {
    if (!box || typeof box !== "object") throw new TypeError("box must be an object");
    return {
      ...box,
      slots: Array.isArray(box.slots) ? box.slots.map(clonePokemon) : [],
    };
  }) : [];
  const currentBox = Number.isInteger(input.currentBox) ? input.currentBox : 0;
  return { ...input, party, boxes, currentBox };
}

function parseCapacity(value, fallback, field) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return parsed;
}

export function partyFull(state, maxPartySize = 6) {
  const value = cloneState(state);
  const limit = parseCapacity(maxPartySize, 6, "maxPartySize");
  return value.party.length >= limit;
}

function boxCapacity(box, fallbackCapacity) {
  return parseCapacity(box.capacity, fallbackCapacity, "box capacity");
}

function firstFreeBoxSlot(box, fallbackCapacity) {
  const capacity = boxCapacity(box, fallbackCapacity);
  for (let i = 0; i < capacity; i += 1) {
    if (box.slots[i] == null) return i;
  }
  return -1;
}

export function boxesFull(state, defaultBoxCapacity = 30) {
  const value = cloneState(state);
  if (value.boxes.length === 0) return true;
  return value.boxes.every((box) => firstFreeBoxSlot(box, defaultBoxCapacity) < 0);
}

export function storeCaughtInBoxes(state, pokemon, options = {}) {
  const value = cloneState(state);
  const defaultBoxCapacity = parseCapacity(options.defaultBoxCapacity, 30, "defaultBoxCapacity");
  if (value.boxes.length === 0) {
    return { state: value, storedBox: -1, storedSlot: -1, operations: [{ op: "boxes_full" }] };
  }
  const currentBox = value.currentBox >= 0 && value.currentBox < value.boxes.length ? value.currentBox : 0;
  const order = [currentBox, ...value.boxes.map((_, i) => i).filter((i) => i !== currentBox)];
  const operations = [];
  if (options.healStoredPokemon && currentBox >= 0) operations.push({ op: "heal_before_storage" });
  for (const boxIndex of order) {
    const slot = firstFreeBoxSlot(value.boxes[boxIndex], defaultBoxCapacity);
    if (slot < 0) continue;
    const slots = value.boxes[boxIndex].slots.slice();
    while (slots.length <= slot) slots.push(null);
    slots[slot] = clonePokemon(pokemon);
    value.boxes[boxIndex] = { ...value.boxes[boxIndex], slots };
    value.currentBox = boxIndex;
    operations.push({ op: "store_in_box", box: boxIndex, slot });
    return { state: value, storedBox: boxIndex, storedSlot: slot, operations };
  }
  operations.push({ op: "boxes_full" });
  return { state: value, storedBox: -1, storedSlot: -1, operations };
}

export function storePokemonHandoff(state, pokemon, options = {}) {
  const value = cloneState(state);
  const maxPartySize = parseCapacity(options.maxPartySize, 6, "maxPartySize");
  const defaultBoxCapacity = parseCapacity(options.defaultBoxCapacity, 30, "defaultBoxCapacity");
  if (partyFull(value, maxPartySize) && boxesFull(value, defaultBoxCapacity)) {
    return {
      result: "full",
      state: value,
      partyIndex: null,
      storedBox: -1,
      storedSlot: -1,
      operations: [{ op: "no_room" }],
    };
  }
  const operations = [{ op: "record_first_moves" }];
  if (!partyFull(value, maxPartySize)) {
    value.party.push(clonePokemon(pokemon));
    operations.push({ op: "add_to_party", index: value.party.length - 1 });
    return { result: "party", state: value, partyIndex: value.party.length - 1, storedBox: null, storedSlot: null, operations };
  }
  const stored = storeCaughtInBoxes(value, pokemon, options);
  operations.push(...stored.operations);
  if (stored.storedBox < 0) {
    operations.push({ op: "no_room" });
    return { result: "full", state: stored.state, partyIndex: null, storedBox: -1, storedSlot: -1, operations };
  }
  return {
    result: "box",
    state: stored.state,
    partyIndex: null,
    storedBox: stored.storedBox,
    storedSlot: stored.storedSlot,
    operations,
  };
}

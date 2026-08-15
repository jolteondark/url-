import { moveStoredPokemon, pokemonAble } from "./party-storage-management.js";

function validateRuntime(runtime) {
  if (!runtime?.player || !Array.isArray(runtime.player.party)) throw new TypeError("runtime player.party is required");
  if (!runtime?.storage_system || !Array.isArray(runtime.storage_system.boxes)) throw new TypeError("runtime storage_system.boxes is required");
  return runtime;
}

function stateFromRuntime(runtime) {
  validateRuntime(runtime);
  return { party: runtime.player.party, boxes: runtime.storage_system.boxes };
}

function applyState(runtime, state) {
  runtime.player.party = state.party;
  runtime.storage_system.boxes = state.boxes;
}

function battleActive(runtime) {
  return Boolean(runtime?.variables?.mapless?.battle);
}

function boxCapacity(box) {
  const value = Number(box?.capacity ?? 30);
  return Number.isInteger(value) && value >= 0 ? value : 30;
}

function firstBoxWithSpace(runtime) {
  for (let boxIndex = 0; boxIndex < runtime.storage_system.boxes.length; boxIndex += 1) {
    const box = runtime.storage_system.boxes[boxIndex];
    const slots = Array.isArray(box?.slots) ? box.slots : [];
    const capacity = boxCapacity(box);
    for (let slotIndex = 0; slotIndex < capacity; slotIndex += 1) {
      if (slots[slotIndex] == null) return boxIndex;
    }
  }
  return -1;
}

export function depositSafariPartyPokemon(runtime, partyIndex, { boxIndex = null } = {}) {
  validateRuntime(runtime);
  if (battleActive(runtime)) return { result: false, reason: "battle_active", operations: [] };
  if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= runtime.player.party.length) {
    return { result: false, reason: "index", operations: [] };
  }
  const destinationBox = boxIndex == null ? firstBoxWithSpace(runtime) : boxIndex;
  if (!Number.isInteger(destinationBox) || destinationBox < 0 || destinationBox >= runtime.storage_system.boxes.length) {
    return { result: false, reason: destinationBox < 0 ? "no_destination" : "box", operations: [] };
  }
  const pokemon = runtime.player.party[partyIndex];
  const otherAble = runtime.player.party.some((entry, index) => index !== partyIndex && pokemonAble(entry));
  if (pokemonAble(pokemon) && !otherAble) {
    return { result: false, reason: "last_able", pokemon, operations: [{ op: "deposit_rejected", reason: "last_able" }] };
  }
  const moved = moveStoredPokemon(stateFromRuntime(runtime), {
    boxSrc: -1,
    indexSrc: partyIndex,
    boxDst: destinationBox,
    indexDst: -1,
    maxPartySize: 6,
    defaultBoxCapacity: 30,
  });
  if (!moved.result) return { ...moved, reason: moved.operations?.[0]?.reason ?? "rejected", pokemon };
  applyState(runtime, moved.state);
  const mapless = runtime.variables?.mapless;
  const boxLabel = runtime.storage_system.boxes[destinationBox]?.name ?? `Box ${destinationBox + 1}`;
  if (mapless) mapless.notice = `${pokemon.species}を${boxLabel}へ預けました。`;
  return {
    result: true,
    pokemon,
    destination: moved.destination,
    operations: [...moved.operations, { op: "request_save", reason: "party_storage_deposit" }],
    persistenceRequested: true,
    notice: mapless?.notice ?? `${pokemon.species}を${boxLabel}へ預けました。`,
  };
}

export function withdrawSafariStoragePokemon(runtime, boxIndex, slotIndex) {
  validateRuntime(runtime);
  if (battleActive(runtime)) return { result: false, reason: "battle_active", operations: [] };
  if (runtime.player.party.length >= 6) return { result: false, reason: "party_full", operations: [{ op: "withdraw_rejected", reason: "party_full" }] };
  if (!Number.isInteger(boxIndex) || boxIndex < 0 || boxIndex >= runtime.storage_system.boxes.length) {
    return { result: false, reason: "box", operations: [] };
  }
  const slots = runtime.storage_system.boxes[boxIndex]?.slots;
  if (!Array.isArray(slots) || !Number.isInteger(slotIndex) || slotIndex < 0 || !slots[slotIndex]) {
    return { result: false, reason: "slot", operations: [] };
  }
  const pokemon = slots[slotIndex];
  const moved = moveStoredPokemon(stateFromRuntime(runtime), {
    boxSrc: boxIndex,
    indexSrc: slotIndex,
    boxDst: -1,
    indexDst: -1,
    maxPartySize: 6,
    defaultBoxCapacity: 30,
  });
  if (!moved.result) return { ...moved, reason: moved.operations?.[0]?.reason ?? "rejected", pokemon };
  applyState(runtime, moved.state);
  const mapless = runtime.variables?.mapless;
  if (mapless) mapless.notice = `${pokemon.species}をPartyへ引き出しました。`;
  return {
    result: true,
    pokemon,
    destination: moved.destination,
    operations: [...moved.operations, { op: "request_save", reason: "party_storage_withdraw" }],
    persistenceRequested: true,
    notice: mapless?.notice ?? `${pokemon.species}をPartyへ引き出しました。`,
  };
}

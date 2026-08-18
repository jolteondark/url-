import { storeCaughtInBoxes } from "./party-storage-handoff.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function isEgg(pokemon) {
  return Boolean(pokemon?.egg ?? pokemon?.is_egg ?? false);
}

export function maplessPartyAllFainted(party) {
  const eligible = (Array.isArray(party) ? party : []).filter((pokemon) => pokemon && !isEgg(pokemon));
  return eligible.length > 0 && eligible.every((pokemon) => Number(pokemon.hp ?? 0) <= 0);
}

export function shouldMarkMaplessRunEnd(runtime, decision) {
  const state = stateOf(runtime);
  return Boolean(state.mapless_run_active)
    && [2, 5].includes(Number(decision))
    && maplessPartyAllFainted(runtime?.player?.party);
}

export function markMaplessRunEnd(runtime, decision) {
  const state = stateOf(runtime);
  if (!shouldMarkMaplessRunEnd(runtime, decision)) {
    return { marked: false, operations: [] };
  }
  state.mapless_run_end_pending = true;
  const operations = [{ op: "mark_run_end", decision: Number(decision) }];
  return { marked: true, operations };
}

function archiveRunParty(runtime) {
  const storage = runtime?.storage_system;
  if (!storage || !Array.isArray(storage.boxes)) throw new TypeError("runtime storage_system is required");
  let boxes = structuredClone(storage.boxes);
  let currentBox = Number.isInteger(storage.currentBox) ? storage.currentBox : 0;
  const remaining = [];
  const operations = [];

  for (let index = 0; index < (runtime?.player?.party ?? []).length; index += 1) {
    const pokemon = runtime.player.party[index];
    if (!pokemon) continue;
    const stored = storeCaughtInBoxes({ party: [], boxes, currentBox }, pokemon, { healStoredPokemon: false });
    boxes = stored.state.boxes;
    currentBox = stored.state.currentBox;
    if (stored.storedBox < 0) {
      remaining.push(structuredClone(pokemon));
      operations.push({ op: "run_archive_overflow", partyIndex: index });
    } else {
      operations.push({
        op: "archive_run_party_pokemon",
        partyIndex: index,
        box: stored.storedBox,
        slot: stored.storedSlot,
      });
    }
  }

  runtime.player.party = remaining;
  storage.boxes = boxes;
  storage.currentBox = currentBox;
  return { overflow: remaining.length > 0, operations };
}

export function finishMaplessRun(runtime) {
  const state = stateOf(runtime);
  if (!state.mapless_run_end_pending || !state.mapless_run_active) {
    return { finished: false, overflow: false, operations: [] };
  }

  const archived = archiveRunParty(runtime);
  state.mapless_run_end_pending = false;
  state.mapless_run_active = false;
  state.mapless_run_prepared = false;
  state.mapless_carryover_pending = true;
  state.mapless_carryover_overflow = archived.overflow;

  runtime.bag ??= { slots: [], money: 0 };
  runtime.bag.slots = [];
  runtime.bag.money = 0;

  const operations = [
    ...archived.operations,
    { op: "clear_run_bag" },
    { op: "clear_run_money" },
    { op: "set_run_active", value: false },
    { op: "set_run_prepared", value: false },
    { op: "set_carryover_pending", value: true },
    { op: "set_carryover_overflow", value: archived.overflow },
    { op: "request_save", reason: "mapless_run_end" },
  ];

  return { finished: true, overflow: archived.overflow, operations };
}

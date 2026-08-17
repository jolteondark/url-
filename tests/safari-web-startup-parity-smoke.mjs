import assert from "node:assert/strict";
import { createSafariPlayableRuntime as createFull } from "../runtime/safari-playable-integration.js";
import { createSafariPlayableRuntime as createStartup } from "../runtime/safari-web-startup.js";

const full = createFull();
const startup = createStartup();
const fullState = full.variables.mapless;
const startupState = startup.variables.mapless;

assert.deepEqual(startup.player.party[0], full.player.party[0], "bootstrap starter must exactly match the Pokemon Runtime owner snapshot");
assert.equal(startupState.day, fullState.day);
assert.equal(startupState.location, fullState.location);
assert.equal(startup.bag.money, full.bag.money);
assert.deepEqual(startup.storage_system, full.storage_system);
assert.deepEqual(
  startupState.board_events.map((event) => ({
    kind: event.kind,
    type: event.type ?? null,
    normal_event_id: event.normal_event_id ?? null,
    species_id: event.species_id ?? null,
    species_name: event.species_name ?? null,
    level: event.level ?? null,
  })),
  fullState.board_events.map((event) => ({
    kind: event.kind,
    type: event.type ?? null,
    normal_event_id: event.normal_event_id ?? null,
    species_id: event.species_id ?? null,
    species_name: event.species_name ?? null,
    level: event.level ?? null,
  })),
  "startup board projection must match the full owner before scene-specific hydration",
);
assert.deepEqual(startupState.board_revealed, fullState.board_revealed);
assert.deepEqual(startupState.board_consumed, fullState.board_consumed);
assert.deepEqual(startupState.board_visited, fullState.board_visited);

console.log("Safari lightweight startup parity: ok");

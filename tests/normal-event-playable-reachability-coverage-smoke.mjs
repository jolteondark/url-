import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { MAPLESS_V108_NORMAL_EVENT_WEIGHTS } from "../runtime/mapless-normal-event-v108-preparation.js";

const here = dirname(fileURLToPath(import.meta.url));
const commandSource = await readFile(resolve(here, "../runtime/safari-pokemon-center-command.js"), "utf8");
const handoffSource = await readFile(resolve(here, "../runtime/safari-normal-event-touch-handoff.js"), "utf8");

const registered = Object.keys(MAPLESS_V108_NORMAL_EVENT_WEIGHTS);
const uncovered = registered.filter((eventId) => {
  const literal = JSON.stringify(eventId);
  return !commandSource.includes(literal) && !handoffSource.includes(literal);
});

assert.deepEqual(
  uncovered,
  [],
  `Every canonical v0.9.108 registered normal event must have a Safari playable dispatch/handoff reference. Missing: ${uncovered.join(", ")}`,
);

for (const eventId of ["bloodline_grandmother", "retired_warrior"]) {
  assert.ok(commandSource.includes(JSON.stringify(eventId)), `${eventId} must stay on the dedicated free-teacher Safari dispatch path`);
}

console.log(`normal-event playable reachability coverage smoke: ${registered.length} registered events covered`);

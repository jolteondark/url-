import assert from "node:assert/strict";
import { updatePokemonRuntime } from "../runtime/pokemon-runtime.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration-wounded.js";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";

const runtime = createSafariPlayableRuntime();
const centerIndex = runtime.variables.mapless.board_events.findIndex((event) => event?.kind === "center");
assert.ok(centerIndex >= 0, "generated Day Board must contain a center");

const starter = runtime.player.party[0];
runtime.player.party[0] = updatePokemonRuntime(starter, {
  hp: 1,
  status: "BURN",
  status_count: 2,
  moves: starter.moves.map((move) => ({ id: typeof move === "string" ? move : move.id, pp: 1, ppup: 0 })),
});

const result = activateSafariDayBoardCell(runtime, centerIndex);
const healed = runtime.player.party[0];
assert.equal(result.centerOwner.result, "center_healed");
assert.equal(result.persistenceRequested, true);
assert.equal(healed.hp, healed.max_hp);
assert.equal(healed.status, "NONE");
assert.equal(healed.status_count, 0);
assert.ok(healed.moves.every((move) => typeof move === "object" && move.pp > 1));
assert.equal(runtime.variables.mapless.board_consumed[centerIndex], true);
assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "pokemon_center_owner"));

console.log(JSON.stringify({ ok: true, centerIndex, hp: healed.hp, movePp: healed.moves.map((move) => move.pp) }));

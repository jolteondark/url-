import assert from "node:assert/strict";
import { ensureMaplessPlayerIdentityV108, maplessPlayerPublicIdV108, maplessPlayerSecretIdV108 } from "../runtime/mapless-player-identity-v108.js";
import { resolveSafariNewPokemonCreationContextV108 } from "../runtime/safari-new-pokemon-creation-context-v108.js";

const draws = [0x1234, 0xabcd];
const player = { party: [] };
const id = ensureMaplessPlayerIdentityV108(player, (limit) => {
  assert.equal(limit, 0x10000);
  return draws.shift();
});
assert.equal(id, 0xabcd1234 >>> 0);
assert.equal(maplessPlayerPublicIdV108(player), 0x1234);
assert.equal(maplessPlayerSecretIdV108(player), 0xabcd);

const preserved = ensureMaplessPlayerIdentityV108(player, () => { throw new Error("must not redraw persisted identity"); });
assert.equal(preserved, id);

const runtime = { player };
assert.deepEqual(resolveSafariNewPokemonCreationContextV108(runtime, { now: new Date(2026, 8, 12, 12, 0, 0) }), {
  mapId: 1,
  environment: "NONE",
  dayNight: "DAY",
  playerSecretId: 0xabcd,
});
assert.equal(resolveSafariNewPokemonCreationContextV108(runtime, { now: new Date(2026, 8, 12, 18, 0, 0) }).dayNight, "EVENING");
assert.equal(resolveSafariNewPokemonCreationContextV108(runtime, { now: new Date(2026, 8, 12, 22, 0, 0) }).dayNight, "NIGHT");

console.log("player identity + Safari creation context smoke passed");

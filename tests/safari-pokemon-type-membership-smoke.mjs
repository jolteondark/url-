import assert from "node:assert/strict";
import { SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";
import { hasSafariUsablePartyType, safariPokemonTypes } from "../runtime/safari-pokemon-type-membership.js";

const original = Object.getOwnPropertyDescriptor(SAFARI_SPECIES_MASTERS, "TESTWATER");
Object.defineProperty(SAFARI_SPECIES_MASTERS, "TESTWATER", {
  configurable: true,
  enumerable: true,
  writable: true,
  value: Object.freeze({ id: "TESTWATER", types: Object.freeze(["WATER"]) }),
});

try {
  const capturedLike = { species: "TESTWATER", hp: 12, max_hp: 12, egg: false };
  const runtime = { player: { party: [capturedLike] } };
  assert.deepEqual(safariPokemonTypes(capturedLike), ["WATER"], "runtime without inline types must fall back to the species master");
  assert.equal(hasSafariUsablePartyType(runtime, "WATER", "ICE"), true);
  assert.equal(hasSafariUsablePartyType(runtime, "FIRE"), false);
  assert.equal(hasSafariUsablePartyType({ player: { party: [{ ...capturedLike, hp: 0 }] } }, "WATER"), false,
    "fainted type members must not unlock event routes");
  assert.equal(hasSafariUsablePartyType({ player: { party: [{ ...capturedLike, egg: true }] } }, "WATER"), false,
    "eggs must not unlock event routes");

  const inline = { species: "TESTWATER", hp: 12, types: ["ICE"] };
  assert.deepEqual(safariPokemonTypes(inline), ["ICE"], "explicit runtime type facts remain authoritative when present");
} finally {
  if (original) Object.defineProperty(SAFARI_SPECIES_MASTERS, "TESTWATER", original);
  else Reflect.deleteProperty(SAFARI_SPECIES_MASTERS, "TESTWATER");
}

console.log("Safari Pokemon type membership species-master fallback: PASS");

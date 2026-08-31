import assert from "node:assert/strict";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

for (const itemId of ["POKEDOLL", "FLUFFYTAIL", "POKETOY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.known, true, `${itemId} should be reviewed`);
  assert.equal(status.status, "effect_mapped_owner_blocked", `${itemId} must not be reported connected until the Battle Bag no-target adapter reaches the certain-escape owner`);
  assert.equal(status.family, "battle_certain_escape");
  assert.match(status.ownerNeeded, /safari-flee-command/);
  assert.match(status.ownerNeeded, /certainEscapeByItem=true/);
  assert.match(status.ownerNeeded, /consume only after successful escape/);
}

console.log("certain escape item support status smoke: ok");

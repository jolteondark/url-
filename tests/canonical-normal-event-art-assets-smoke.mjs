import assert from "node:assert/strict";
import {
  canonicalNormalEventArtDescriptor,
  hasCanonicalNormalEventArtSource,
  resolveCanonicalNormalEventArt,
} from "../runtime/canonical-normal-event-art-assets.js";

for (const [eventId, filename] of [
  ["evolution_lab", "ev_evolab.png"],
  ["old_statue", "ev_statue.png"],
  ["wishing_fountain", "ev_wishingwell.png"],
  ["sleeping_giant", "ev_giant.png"],
  ["berry_thief", "ev_berrythief.png"],
]) {
  const descriptor = canonicalNormalEventArtDescriptor(eventId);
  assert.equal(descriptor?.filename, filename);
  assert.equal(descriptor?.path, `assets/canonical-normal-event-art/${filename}`);
  assert.equal(descriptor?.published, false, `${eventId} must remain unpublished until exact PNG bytes are verified`);
  assert.equal(hasCanonicalNormalEventArtSource(eventId), true);
  assert.equal(resolveCanonicalNormalEventArt(eventId), null, `${eventId} must fail closed before exact-byte publication`);
}

assert.equal(canonicalNormalEventArtDescriptor("not_a_real_event"), null);
assert.equal(hasCanonicalNormalEventArtSource("not_a_real_event"), false);
assert.equal(resolveCanonicalNormalEventArt("not_a_real_event"), null);

console.log("Canonical normal-event art resolver smoke: PASS");

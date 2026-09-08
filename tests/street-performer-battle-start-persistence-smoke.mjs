import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const interactionSource = await readFile(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");
const continuationSource = await readFile(new URL("../runtime/safari-normal-event-battle-continuation.js", import.meta.url), "utf8");

const calloutStart = interactionSource.slice(interactionSource.indexOf('if (raw === "callout")'));
assert.match(calloutStart, /normal_event_trainer_battle_started/);
assert.doesNotMatch(calloutStart, /street_performer_battle_started/);
assert.match(calloutStart, /return started;/);

assert.match(
  continuationSource,
  /request_save[^\n]+normal_event_battle_started/,
  "shared normal-event Battle continuation must own the Battle-start save intent",
);

console.log("street performer Battle start persistence smoke: ok");

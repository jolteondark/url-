import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");

const calloutStart = source.slice(source.indexOf('if (raw === "callout")'));
assert.match(calloutStart, /normal_event_trainer_battle_started/);
assert.match(calloutStart, /request_save[^\n]+street_performer_battle_started/);
assert.match(calloutStart, /persistenceRequested:true/);

console.log("street performer Battle start persistence smoke: ok");

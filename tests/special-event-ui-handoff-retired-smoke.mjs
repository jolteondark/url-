import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const legacy = await readFile(new URL("../board-special-event-ui-handoff.js", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));
const oldStatue = await readFile(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../crumbling-bridge-touch-presentation.js", import.meta.url), "utf8");

assert.doesNotMatch(legacy, /addEventListener|setTimeout|setInterval|POLL_INTERVAL_MS|MAX_POLLS/);
assert.doesNotMatch(manifest.modules.join("\n"), /board-special-event-ui-handoff/);
assert.match(oldStatue, /publish\("safari-normal-event-ui"\)/);
assert.match(bridge, /publish\("safari-normal-event-ui"\)/);

console.log("special event UI handoff retired smoke: ok");

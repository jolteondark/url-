import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/safari-bounty-poster-interaction.js", import.meta.url), "utf8");
const shared = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const legacy = await readFile(new URL("../bounty-poster-owner-action-handoff.js", import.meta.url), "utf8");
const manifest = await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8");

assert.match(command, /openSafariBountyPosterTouch/);
assert.match(command, /normal_event_id === "bounty_poster"/);
assert.match(shared, /bounty_poster:"\.\/runtime\/safari-bounty-poster-interaction\.js"/);
assert.match(shared, /resolveSafariBountyPosterInteraction/);
assert.match(owner, /resolveCanonicalNormalEvent\("bounty_poster"/);
assert.match(owner, /request_save/);
assert.doesNotMatch(owner, /addEventListener\("click"|persistSafariOwnerResult/);
assert.doesNotMatch(legacy, /addEventListener\("click"|stopImmediatePropagation|persistSafariOwnerResult|saveSafariPlayableRun/);
assert.match(legacy, /resolveSafariBountyPosterInteraction/);
assert.doesNotMatch(manifest, /bounty-poster-owner-action-handoff/);

console.log("bounty poster shared dispatch smoke: ok");

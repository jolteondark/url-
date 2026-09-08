import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const preview = await readFile(new URL("../preview-app.js", import.meta.url), "utf8");
const legacy = await readFile(new URL("../day-board-direct-persistence-handoff.js", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));

assert.match(preview, /autoSaveIfRequested\(result, "Day Board auto-save"\)/);
assert.match(preview, /persistSafariOwnerResult/);
assert.doesNotMatch(legacy, /addEventListener|setTimeout|setInterval|__maplessLastBoardPersistence/);
assert.doesNotMatch(manifest.modules.join("\n"), /day-board-direct-persistence-handoff/);

console.log("day board persistence single-owner smoke: ok");

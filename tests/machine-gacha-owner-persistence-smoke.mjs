import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ownerSource = await readFile(new URL("../runtime/safari-playable-integration-pre-wounded.js", import.meta.url), "utf8");
const adapterSource = await readFile(new URL("../runtime/safari-machine-gacha-interaction.js", import.meta.url), "utf8");

assert.match(ownerSource, /if \(draws > 0\) operations\.push\(\{ op: "request_save", reason: "machine_gacha_purchase" \}\);/,
  "successful machine gacha draws must emit one owner request_save");
assert.doesNotMatch(adapterSource, /persistenceRequested:\s*true/,
  "Safari adapter must not hard-code machine gacha persistence");
assert.match(adapterSource, /persistenceRequested:\s*\(result\.operations \?\? \[\]\)\.some\(\(op\) => op\?\.op === "request_save"\)/,
  "Safari adapter must derive persistence from owner operations");

console.log("machine gacha owner persistence smoke: ok");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "runtime", "safari-playable-integration-pre-wounded.js"), "utf8");

assert.match(source, /if \(draws > 0\) operations\.push\(\{ op: "request_save", reason: "machine_gacha_purchase" \}\);/);
assert.match(source, /if \(state\.board_consumed\[index\] && !operations\.some\(\(op\) => op\?\.op === "request_save"\)\) \{/);
assert.match(source, /operations\.push\(\{ op: "request_save", reason: "machine_gacha_terminal" \}\);/);

const terminalGuard = source.indexOf('reason: "machine_gacha_terminal"');
const notice = source.indexOf("state.notice = rewards.length > 0");
assert.ok(terminalGuard > 0 && terminalGuard < notice, "terminal save intent must be emitted before returning the interaction result");

console.log("machine gacha terminal persistence smoke: ok");

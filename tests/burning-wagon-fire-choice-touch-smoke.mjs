import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const handoff = await readFile(new URL("../runtime/safari-normal-event-touch-handoff.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/safari-burning-wagon-interaction.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(handoff, /import \{ safariBurningWagonFireChoices \} from "\.\/safari-burning-wagon-interaction\.js";/);
assert.match(handoff, /for \(const item of safariBurningWagonFireChoices\(runtime, index\)\)/);
assert.match(handoff, /id:`fire:\$\{item\}`/);
assert.match(handoff, /id:"fire:none"/);
assert.doesNotMatch(handoff, /\{id:"fire",label:"ほのおタイプに延焼を制御させる"/);

assert.match(owner, /rawAction\.startsWith\("fire:"\)/);
assert.match(owner, /fire_choice:selectedFireChoice/);
assert.match(owner, /fire_choice:canonicalAction === "fire" \? selectedFireChoice : undefined/);

assert.match(index, /"\.\/runtime\/safari-normal-event-touch-handoff\.js": "\.\/runtime\/safari-normal-event-touch-handoff\.js\?v=20260912-1730"/);

console.log("burning wagon fire choice touch smoke: ok");

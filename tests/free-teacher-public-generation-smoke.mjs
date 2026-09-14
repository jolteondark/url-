import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const touch = await readFile(new URL("../runtime/safari-free-teacher-touch.js", import.meta.url), "utf8");
const presentation = await readFile(new URL("../free-teacher-touch-presentation.js", import.meta.url), "utf8");

for (const path of [
  "safari-pokemon-center-command.js",
  "safari-free-teacher-touch.js",
  "safari-free-teacher-interaction.js",
  "mapless-free-teacher-v108.js",
  "mapless-teacher-move-projection-v108.js",
  "mapless-pokemon-move-learn-v108.js",
]) {
  assert.match(index, new RegExp(`${path.replaceAll(".", "\\.")}\\?v=20260914-2358`), `${path} must use the free-teacher public generation`);
}
assert.match(index, /free-teacher-touch-presentation\.js\?v=20260914-2358/);
assert.match(touch, /actions:\[\]/, "shared normal-event shell must receive a safe empty action list before the teacher sidecar renders");
assert.match(presentation, /free_teacher_pokemon/);
assert.match(presentation, /free_teacher_move_replacement/);
assert.match(presentation, /continueSafariFreeTeacherTouch/);
assert.match(presentation, /persistSafariOwnerResult/);
assert.doesNotMatch(presentation, /saveSafariPlayableRun/);

console.log("free teacher public generation smoke: ok");

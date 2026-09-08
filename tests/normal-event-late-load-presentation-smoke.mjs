import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fakeNurse = await readFile(new URL("../fake-nurse-check-id-presentation.js", import.meta.url), "utf8");
const burningWagon = await readFile(new URL("../burning-wagon-fire-presentation.js", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));
const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(fakeNurse, /window\.addEventListener\("safari-normal-event-rendered", enhance/);
assert.match(fakeNurse, /window\.addEventListener\("pageshow", enhance/);
assert.match(fakeNurse, /\nenhance\(\);\s*$/);
assert.match(fakeNurse, /safariFakeNurseWarning\(current, active\.boardIndex\)/);
assert.match(fakeNurse, /actions\.querySelector\('\[data-normal-event-action="check_id:heal"\]'\)/);

assert.match(burningWagon, /window\.addEventListener\("safari-normal-event-rendered", reconcile/);
assert.match(burningWagon, /window\.addEventListener\("pageshow", reconcile/);
assert.match(burningWagon, /\nreconcile\(\);\s*$/);
assert.match(burningWagon, /safariBurningWagonFireChoices\(context\.runtime, context\.active\.boardIndex\)/);
assert.match(burningWagon, /current\.active\.boardIndex !== context\.active\.boardIndex/);
assert.match(burningWagon, /!fireButton\.isConnected/);

for (const source of [fakeNurse, burningWagon]) {
  assert.doesNotMatch(source, /addEventListener\("click"|persistSafariOwnerResult|saveSafariPlayableRun|localStorage\./);
}

for (const path of [
  "./fake-nurse-check-id-presentation.js?v=20260908-1400",
  "./burning-wagon-fire-presentation.js?v=20260908-1400",
]) {
  assert.ok(manifest.modules.includes(path), `manifest missing ${path}`);
  assert.ok(loader.includes(`"${path}"`), `fallback loader missing ${path}`);
}

console.log("normal-event late-load presentation smoke: ok");

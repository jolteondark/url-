import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-fake-nurse-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /\{op:"request_save",reason:"fake_nurse_resolved"\}/,
  "resolved Fake Nurse state must carry the owner save intent through operations",
);
assert.doesNotMatch(
  source,
  /persistenceRequested\s*:\s*true/,
  "Fake Nurse resolved routes must not keep a second Safari persistence truth",
);

const continuation = source.slice(
  source.indexOf('registerSafariNormalEventBattleContinuation("fake_nurse"'),
  source.indexOf("export function safariFakeNurseWarning"),
);
assert.match(continuation, /operations:state\.last_operations/);
assert.doesNotMatch(continuation, /persistenceRequested/);

for (const marker of ['if(raw==="leave")', 'if(raw==="pay")', 'if(event.normal_data?.fake!==true)', 'if(idRoll<50)']) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing Fake Nurse route marker: ${marker}`);
  const nextCommit = source.indexOf("commit(runtime,index,owner", start);
  assert.notEqual(nextCommit, -1, `resolved Fake Nurse route must commit owner operations: ${marker}`);
}

assert.match(source, /persistenceRequested:false/, "non-mutating failed purchase routes may explicitly remain non-persistent");
console.log("fake nurse owner persistence smoke: ok");

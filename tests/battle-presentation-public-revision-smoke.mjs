import fs from "node:fs";
import assert from "node:assert/strict";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

const revisionMatch = loader.match(/const BATTLE_PRESENTATION_PUBLIC_REVISION = "([^"]+)";/);
assert.ok(revisionMatch, "deferred loader must define one shared Battle presentation public revision");
assert.match(
  loader,
  /const battlePresentationUrl = \(path\) => `\$\{path\}\?v=\$\{BATTLE_PRESENTATION_PUBLIC_REVISION\}`;/,
  "Battle presentation URLs must be built through the shared revision helper",
);

for (const required of [
  "./battle-core-safety.css",
  "./canonical-battle-sprite-bridge.js",
  "./canonical-battle-back-atlas-patch.js",
  "./canonical-battleback-message-bridge.js",
  "./canonical-battleback-presentation-bridge.js",
  "./canonical-battle-ui.css",
  "./canonical-battle-status.css",
  "./canonical-battle-ui-bridge.js",
  "./canonical-battle-status-bridge.js",
  "./trainer-battle-presentation.css",
  "./trainer-battle-presentation.js",
]) {
  assert.ok(
    loader.includes(`battlePresentationUrl("${required}")`),
    `${required} must use the shared Battle presentation delivery revision`,
  );
}

for (const staleRevision of [
  "20260825-1042",
  "20260827-1604",
  "20260831-1604",
  "20260829-2001",
  "20260830-0500",
]) {
  assert.ok(!loader.includes(`?v=${staleRevision}`), `stale Battle presentation revision ${staleRevision} must be removed`);
}

console.log(`battle presentation public revision smoke: ok (${revisionMatch[1]})`);

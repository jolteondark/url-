import assert from "node:assert/strict";
import fs from "node:fs";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const consumer = fs.readFileSync(new URL("../trainer-battle-canonical-sprite.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  loader,
  /loadModule\(battlePresentationUrl\("\.\/trainer-battle-canonical-sprite\.js"\)\)/,
  "reachable trainer Battles must load the canonical trainer sprite consumer",
);
assert.match(
  loader,
  /state\.battle\.kind === "trainer"\) loadTrainerBattlePresentation\(\)/,
  "canonical trainer sprite delivery must remain scoped to trainer Battles",
);
assert.match(
  consumer,
  /canonicalTrainerAssetUrl\(`\$\{trainerType\}\.png`\)/,
  "trainer sprite consumer must resolve trainer_type through the shared canonical trainer resolver",
);
assert.match(
  consumer,
  /image\.hidden = true;[\s\S]*image\.removeAttribute\("src"\)/,
  "missing canonical trainer assets must fail closed",
);
assert.match(
  index,
  /<script type="module" src="\.\/deferred-ui-loader\.js\?v=20260902-2015"><\/script>/,
  "Safari HTML entry must request the deferred loader generation containing canonical trainer sprite delivery",
);
assert.ok(
  !index.includes('<script type="module" src="./deferred-ui-loader.js?v=20260902-1901"></script>'),
  "Safari HTML entry must not regress to the pre-trainer-sprite loader generation",
);

console.log("ok - canonical trainer sprite delivery");

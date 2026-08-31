import assert from "node:assert/strict";
import { resolveCanonicalHpFunctionEffect } from "../runtime/battle-core-hp-function-effects.js";

function resolve(resolvedDamage, actorHp = 1, actorMaxHp = 200) {
  return resolveCanonicalHpFunctionEffect({
    functionCode: "HealUserByHalfOfDamageDoneBurnTarget",
    resolvedDamage,
    actorHp,
    actorMaxHp,
    targetAffected: true,
    moveExecuted: true,
  });
}

const one = resolve(1);
assert.equal(one.heal, 1);
assert.equal(one.hpAfter, 2);

const even = resolve(100);
assert.equal(even.heal, 50);
assert.equal(even.hpAfter, 51);

const odd = resolve(101);
assert.equal(odd.heal, 51);
assert.equal(odd.hpAfter, 52);

const capped = resolve(101, 180, 200);
assert.equal(capped.heal, 20);
assert.equal(capped.hpAfter, 200);

const noDamage = resolve(0);
assert.equal(noDamage.heal, 0);
assert.equal(noDamage.hpAfter, 1);

console.log("Matcha Gotcha canonical drain smoke: ok");

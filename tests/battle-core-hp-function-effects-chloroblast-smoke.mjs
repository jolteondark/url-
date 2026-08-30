import assert from "node:assert/strict";
import { resolveCanonicalHpFunctionEffect } from "../runtime/battle-core-hp-function-effects.js";

const even = resolveCanonicalHpFunctionEffect({
  functionCode: "RecoilHalfOfTotalHP",
  actorHp: 100,
  actorMaxHp: 100,
  targetAffected: true,
});
assert.equal(even.selfDamage, 50);
assert.equal(even.hpAfter, 50);

const odd = resolveCanonicalHpFunctionEffect({
  functionCode: "RecoilHalfOfTotalHP",
  actorHp: 101,
  actorMaxHp: 101,
  targetAffected: true,
});
assert.equal(odd.selfDamage, 51);
assert.equal(odd.hpAfter, 50);

const rockHead = resolveCanonicalHpFunctionEffect({
  functionCode: "RecoilHalfOfTotalHP",
  actorHp: 101,
  actorMaxHp: 101,
  actorAbility: "ROCKHEAD",
  targetAffected: true,
});
assert.equal(rockHead.selfDamage, 0);
assert.equal(rockHead.hpAfter, 101);

const noHit = resolveCanonicalHpFunctionEffect({
  functionCode: "RecoilHalfOfTotalHP",
  actorHp: 101,
  actorMaxHp: 101,
  targetAffected: false,
});
assert.equal(noHit.selfDamage, 0);
assert.equal(noHit.hpAfter, 101);

console.log("Chloroblast canonical recoil smoke: ok");

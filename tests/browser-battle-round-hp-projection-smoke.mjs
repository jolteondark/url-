import assert from "node:assert/strict";
import { projectBrowserBattleResolvedHp } from "../runtime/browser-battle-round-hp-projection.js";

const initial = { species: "SPINARAK", hp: 13, max_hp: 13 };
const afterFirst = projectBrowserBattleResolvedHp(initial, [
  { op: "reduce_hp", actor: "player", target: "foe", hpAfter: 8 },
], "foe");
assert.equal(afterFirst.hp, 8);
assert.equal(initial.hp, 13, "projection must not mutate the source snapshot");

const afterSecond = projectBrowserBattleResolvedHp(afterFirst, [
  { op: "reduce_hp", actor: "player", target: "foe", hpAfter: 3 },
], "foe");
assert.equal(afterSecond.hp, 3);

const fainted = projectBrowserBattleResolvedHp(afterSecond, [
  { op: "faint", actor: "player", target: "foe" },
], "foe");
assert.equal(fainted.hp, 0);

const selfDamage = projectBrowserBattleResolvedHp({ hp: 10, max_hp: 10 }, [
  { op: "reduce_self_hp", actor: "player", target: "player", hpAfter: 7 },
], "player");
assert.equal(selfDamage.hp, 7);

console.log("browser battle round HP projection smoke: ok");

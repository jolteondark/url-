import assert from "node:assert/strict";
import { resolveMaplessV108PartyPercentHeal } from "../runtime/mapless-v108-party-percent-heal.js";

function run(party, fraction) {
  return resolveMaplessV108PartyPercentHeal(party, fraction, {
    getHp:(pokemon) => pokemon.hp,
    getTotalHp:(pokemon) => pokemon.totalHp,
    isFainted:(pokemon) => pokemon.hp <= 0,
    setHp:(pokemon, hp) => { pokemon.hp = hp; },
  });
}

const party = [
  { hp:50, totalHp:100, status:"POISON", moves:[{ pp:1, maxPp:10 }] },
  { hp:99, totalHp:100, status:"BURN", moves:[{ pp:2, maxPp:10 }] },
  { hp:0, totalHp:100, status:"PARALYSIS", moves:[{ pp:3, maxPp:10 }] },
  { hp:5, totalHp:3, status:null, moves:[] },
];
const result = run(party, 0.25);
assert.equal(result.healed, 2);
assert.deepEqual(result.operations, [
  { index:0, hpBefore:50, hpAfter:75, amount:25 },
  { index:1, hpBefore:99, hpAfter:100, amount:1 },
]);
assert.deepEqual(party.map((pokemon) => pokemon.hp), [75,100,0,5]);
assert.equal(party[0].status, "POISON", "percent heal must not cure status");
assert.equal(party[0].moves[0].pp, 1, "percent heal must not restore PP");
assert.equal(party[2].status, "PARALYSIS", "fainted Pokemon must be skipped");

const minimum = [{ hp:1, totalHp:3 }];
assert.equal(run(minimum, 0.10).operations[0].amount, 1, "canonical helper heals at least 1 HP");

for (const [fraction, expectedAmount] of [
  [0.10, 11],
  [0.20, 21],
  [0.25, 26],
  [0.40, 41],
  [0.50, 51],
  [0.75, 76],
]) {
  const oddTotalHp = [{ hp:1, totalHp:101 }];
  const oddResult = run(oddTotalHp, fraction);
  assert.equal(
    oddResult.operations[0].amount,
    expectedAmount,
    `canonical helper ceils 101 * ${fraction}`
  );
}

const capped = [{ hp:99, totalHp:101 }];
assert.equal(run(capped, 0.50).operations[0].amount, 2, "percent heal caps at total HP");

const writes = [];
const full = [{ hp:10, totalHp:10 }];
const fullResult = resolveMaplessV108PartyPercentHeal(full, 0.25, {
  getHp:(pokemon) => pokemon.hp,
  getTotalHp:(pokemon) => pokemon.totalHp,
  isFainted:() => false,
  setHp:(pokemon, hp) => { writes.push(hp); pokemon.hp = hp; },
});
assert.equal(fullResult.healed, 0);
assert.deepEqual(writes, [], "already-full Pokemon must not cross the mutation boundary");

console.log("mapless v0.9.108 party percent-heal owner smoke: ok");

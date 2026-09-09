import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTurnEndStatusItemExtensionCanonical } from "../runtime/battle-core-turn-end-status-item-extension.js";
import { materializeBattleTurnEndChanceContextRuntime } from "../runtime/battle-ability-item-turn-end-runtime.js";

const shedSkinPokemon = {
  hp: 50,
  max_hp: 100,
  status: "POISON",
  ability_id: "SHEDSKIN",
};

const pending = resolveTurnEndStatusItemExtensionCanonical(shedSkinPokemon, {});
assert.equal(pending.triggered, false);
assert.deepEqual(pending.statusCureChanceRequest, {
  status: "POISON",
  source: "ability",
  ability: "SHEDSKIN",
  numerator: 1,
  denominator: 3,
  rollContextKey: "shedSkinRoll",
});

const first = materializeBattleTurnEndChanceContextRuntime(pending, { combatRandomSeed: 12345, battlerIndex: 0 });
const replay = materializeBattleTurnEndChanceContextRuntime(pending, { combatRandomSeed: 12345, battlerIndex: 0 });
assert.equal(first.evaluated, true);
assert.equal(first.roll, replay.roll);
assert.ok([0, 1 / 3, 2 / 3].includes(first.roll));
assert.equal(first.context.shedSkinRoll, first.roll);

const explicit = materializeBattleTurnEndChanceContextRuntime(pending, { shedSkinRoll: 0.5 });
assert.equal(explicit.roll, 0.5);
assert.throws(
  () => materializeBattleTurnEndChanceContextRuntime(pending, {}),
  /requires combatRandomSeed/,
);

let sawCure = false;
let sawNoCure = false;
for (let combatRandomSeed = 0; combatRandomSeed < 256 && !(sawCure && sawNoCure); combatRandomSeed += 1) {
  const chance = materializeBattleTurnEndChanceContextRuntime(pending, { combatRandomSeed, battlerIndex: 0 });
  const resolved = resolveTurnEndStatusItemExtensionCanonical(shedSkinPokemon, chance.context);
  if (resolved.statusCureRequest) sawCure = true;
  else sawNoCure = true;
}
assert.equal(sawCure, true);
assert.equal(sawNoCure, true);

const noStatus = resolveTurnEndStatusItemExtensionCanonical({ ...shedSkinPokemon, status: "NONE" }, {});
assert.equal(noStatus.statusCureChanceRequest, null);
assert.equal(materializeBattleTurnEndChanceContextRuntime(noStatus, {}).evaluated, false);

const runtimeSource = readFileSync(new URL("../runtime/battle-ability-item-turn-end-runtime.js", import.meta.url), "utf8");
assert.doesNotMatch(runtimeSource, /Math\.random/);
assert.match(runtimeSource, /resolveSharedBattleAbilityItemTurnEndCanonical\(\{ pokemon: runtime, context: chance\.context \}\)/);
assert.match(runtimeSource, /statusCureChanceRoll: chance\.evaluated \? chance\.roll : null/);

const integrationSource = readFileSync(new URL("../runtime/battle-runtime-integration.js", import.meta.url), "utf8");
assert.match(integrationSource, /combatRandomSeed: Number\(preparedBattleInput\.combatRandomSeed\) & 0x7fffffff/);
assert.match(integrationSource, /battlerIndex: reflectedBattlerIndex \?\? reflectedActionIndex/);
assert.match(integrationSource, /Boolean\(turnEndCommitted\.commit\?\.statusCured\)/);

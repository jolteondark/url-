import assert from "node:assert/strict";
import { buildBrowserBattlePriorityEntry } from "../runtime/browser-battle-round-runtime.js";
import { commitBattleSystemsHeldItemRuntime } from "../runtime/battle-held-item-runtime-integration.js";
import { scheduleBattlePrioritiesCanonical } from "../runtime/battle-core-priority.js";

function pokemon({ ability = "NONE", heldItem = null, hp = 100, maxHp = 100, speed = 100, legacyItem } = {}) {
  const value = {
    species: "EEVEE",
    level: 20,
    hp,
    max_hp: maxHp,
    stats: { ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: speed },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
    ability,
    held_item: heldItem,
    status: "NONE",
  };
  if (legacyItem !== undefined) value.item = legacyItem;
  return value;
}

const damagingMove = { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40, priority: 0 };
const priorityMove = { ...damagingMove, id: "QUICKATTACK", priority: 1 };
const action = { abilityItemActionBefore: { modifiers: { speedInput: {} }, priorityModifier: 0 } };
const stages = { 0: { SPEED: 0 }, 1: { SPEED: 0 } };

{
  const user = pokemon({ ability: "QUICKDRAW", heldItem: "QUICKCLAW" });
  const entry = buildBrowserBattlePriorityEntry({ action, pokemon: user, targetPokemon: pokemon(), move: damagingMove, statStages: stages, actionIndex: 0, battlerIndex: 0, moveOrderRandomSeed: 3 });
  assert.equal(entry.abilitySubPriority, 1, "Quick Draw must reach live subpriority when its seeded roll triggers");
  assert.equal(entry.itemSubPriority, 0);
  assert.equal(entry.moveOrderResolution.randomRolls.length, 1, "Quick Draw success must skip the Quick Claw roll");
  assert.equal(entry.moveOrderResolution.randomRolls[0].source, "QUICKDRAW");
}

{
  const user = pokemon({ ability: "QUICKDRAW", heldItem: "QUICKCLAW" });
  const entry = buildBrowserBattlePriorityEntry({ action, pokemon: user, targetPokemon: pokemon(), move: damagingMove, statStages: stages, actionIndex: 0, battlerIndex: 0, moveOrderRandomSeed: 10 });
  assert.equal(entry.abilitySubPriority, 0);
  assert.equal(entry.itemSubPriority, 1, "Quick Claw must reach live subpriority after Quick Draw misses");
  assert.equal(entry.moveOrderResolution.randomRolls.length, 2, "Quick Draw miss must advance to exactly one Quick Claw roll");
  assert.deepEqual(entry.moveOrderResolution.randomRolls.map((roll) => roll.source), ["QUICKDRAW", "QUICKCLAW"]);
}

{
  const user = pokemon({ heldItem: "CUSTAPBERRY", hp: 20, maxHp: 100, speed: 50 });
  const target = pokemon({ speed: 200 });
  const entry = buildBrowserBattlePriorityEntry({ action, pokemon: user, targetPokemon: target, move: damagingMove, statStages: stages, actionIndex: 0, battlerIndex: 0, moveOrderRandomSeed: 99 });
  assert.equal(entry.itemSubPriority, 1, "Custap must become live move-first subpriority at its HP threshold");
  assert.equal(entry.moveOrderResolution.randomRolls.length, 0, "Custap must not consume RNG");
  assert.equal(entry.moveOrderResolution.consumeRequest?.item, "CUSTAPBERRY");
  assert.equal(entry.moveOrderResolution.consumeRequest?.permanent, true);

  const committed = commitBattleSystemsHeldItemRuntime({
    battleInput: { rounds: [{ priorityEntries: [entry], actions: [] }] },
    turn: { operations: [] },
    pokemon: { ...user, item: "CUSTAPBERRY", initial_item: "CUSTAPBERRY" },
    reflectedBattlerIndex: 0,
  });
  assert.equal(committed.pokemon.item, null, "Custap must be removed through the held-item lifecycle after its live priority activation");
  assert.equal(committed.commits.length, 1);
  assert.equal(committed.commits[0].source, "shared_priority");
  assert.ok(committed.commits[0].operations.some((operation) => operation.op === "clear_initial_item"));
  assert.ok(committed.commits[0].operations.some((operation) => operation.op === "runtime_held_item_reflection" && operation.item === null));
}

{
  const blocked = buildBrowserBattlePriorityEntry({ action, pokemon: pokemon({ heldItem: "CUSTAPBERRY", hp: 20 }), targetPokemon: pokemon({ ability: "UNNERVE" }), move: damagingMove, statStages: stages, actionIndex: 0, battlerIndex: 0, moveOrderRandomSeed: 99 });
  assert.equal(blocked.itemSubPriority, 0, "opposing Unnerve must block Custap");
  assert.equal(blocked.moveOrderResolution.consumeRequest, null);

  const klutz = buildBrowserBattlePriorityEntry({ action, pokemon: pokemon({ ability: "KLUTZ", heldItem: "CUSTAPBERRY", hp: 20 }), targetPokemon: pokemon(), move: damagingMove, statStages: stages, actionIndex: 0, battlerIndex: 0, moveOrderRandomSeed: 99 });
  assert.equal(klutz.itemSubPriority, 0, "Klutz must suppress Custap");
  assert.equal(klutz.moveOrderResolution.consumeRequest, null);

  const stale = buildBrowserBattlePriorityEntry({ action, pokemon: pokemon({ heldItem: null, hp: 20, legacyItem: "CUSTAPBERRY" }), targetPokemon: pokemon(), move: damagingMove, statStages: stages, actionIndex: 0, battlerIndex: 0, moveOrderRandomSeed: 99 });
  assert.equal(stale.itemSubPriority, 0, "canonical held_item=null must not revive stale Custap aliases");
}

{
  const forcedFirst = buildBrowserBattlePriorityEntry({ action, pokemon: pokemon({ heldItem: "QUICKCLAW", speed: 200 }), targetPokemon: pokemon(), move: damagingMove, statStages: stages, actionIndex: 0, battlerIndex: 0, moveOrderRandomSeed: 10 });
  const higherPriority = buildBrowserBattlePriorityEntry({ action, pokemon: pokemon({ speed: 1 }), targetPokemon: pokemon(), move: priorityMove, statStages: stages, actionIndex: 1, battlerIndex: 1, moveOrderRandomSeed: 99 });
  const scheduled = scheduleBattlePrioritiesCanonical([forcedFirst, higherPriority], { randomSeed: 1 });
  assert.equal(scheduled.order[0], 1, "move priority +1 must still outrank move-first subpriority in priority 0");
}

console.log("browser live seeded move-order smoke: PASS");

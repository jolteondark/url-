import assert from "node:assert/strict";
import {
  acceptSafariVillageBounty,
  attemptSafariCapture,
  createSafariPlayableRuntime,
  enterSafariVillage,
  loadSafariPlayableRun,
  resolveSafariBattleRound,
  returnSafariToDayBoard,
  safariVillagePresentation,
  saveSafariPlayableRun,
  startSafariVillageBounty,
} from "../runtime/safari-playable-integration.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const state = (runtime) => runtime.variables.mapless;

let runtime = createSafariPlayableRuntime();
assert.equal(enterSafariVillage(runtime).result, "entered");
assert.equal(state(runtime).location, "village");
assert.deepEqual(safariVillagePresentation(runtime), {
  active: true,
  actionsLeft: 3,
  actionLimit: 3,
  boardLocked: false,
  hasActiveBounty: false,
  ablePokemonCount: 1,
  quest: {
    species: "RATTATA",
    speciesName: "コラッタ",
    prefix: "凶暴な",
    level: 6,
    reward: 600,
  },
});

const accepted = acceptSafariVillageBounty(runtime, { choice: 0, confirmed: true });
assert.equal(accepted.accepted, true);
assert.equal(accepted.persistenceRequested, true);
assert.equal(state(runtime).village.actions_left, 2);
assert.equal(state(runtime).village.active_bounty.species, "RATTATA");
assert.ok(accepted.operations.some((operation) => operation.op === "consume_village_action"));

const started = startSafariVillageBounty(runtime);
assert.equal(started.result, "battle_started");
assert.equal(state(runtime).village.actions_left, 2);
assert.equal(state(runtime).battle.origin, "village_bounty");
assert.equal(state(runtime).battle.return_target, "village");
assert.ok(started.operations.some((operation) => operation.op === "confirm_bounty_depart"));
assert.ok(started.operations.some((operation) => operation.op === "start_wild_battle_core"));

let completed;
for (let turn = 0; turn < 10 && !state(runtime).battle.completed; turn += 1) {
  completed = resolveSafariBattleRound(runtime, "TACKLE");
}
assert.equal(completed.decision, 1);
assert.equal(completed.persistenceRequested, true);
assert.equal(state(runtime).battle.completed, true);
assert.equal(state(runtime).village.actions_left, 1);
assert.equal(state(runtime).village.active_bounty, null);
assert.equal(runtime.bag.money, 1600);
assert.deepEqual(runtime.bag.slots, []);
assert.ok(completed.operations.some((operation) => operation.op === "request_add_money" && operation.amount === 600));
assert.ok(completed.operations.some((operation) => operation.op === "add_money" && operation.amount === 600));
assert.ok(completed.operations.some((operation) => operation.op === "set_money" && operation.before === 1000 && operation.after === 1600));
assert.ok(completed.operations.some((operation) => operation.op === "request_save"));
assert.ok(completed.presentation.some((event) => event.type === "battle_result" && event.moneyGained === 600));

const returned = returnSafariToDayBoard(runtime);
assert.equal(returned.target, "village");
assert.equal(returned.summary.moneyGained, 600);
assert.equal(state(runtime).location, "village");
assert.equal(state(runtime).battle, null);

const storage = new MemoryStorage();
saveSafariPlayableRun(storage, runtime);
runtime.bag.money = 0;
runtime = loadSafariPlayableRun(storage, runtime).state;
assert.equal(runtime.bag.money, 1600);
assert.equal(state(runtime).village.actions_left, 1);
assert.equal(state(runtime).location, "village");

const captureRuntime = createSafariPlayableRuntime();
enterSafariVillage(captureRuntime);
acceptSafariVillageBounty(captureRuntime, { choice: 0, confirmed: true });
startSafariVillageBounty(captureRuntime);
const captured = attemptSafariCapture(captureRuntime);
assert.equal(captured.result, "caught");
assert.equal(captured.persistenceRequested, true);
assert.equal(captureRuntime.player.party.length, 2);
assert.equal(captureRuntime.bag.money, 1600);
assert.equal(state(captureRuntime).village.actions_left, 1);
assert.equal(state(captureRuntime).village.active_bounty, null);
assert.equal(returnSafariToDayBoard(captureRuntime).target, "village");

const blockedRuntime = createSafariPlayableRuntime();
enterSafariVillage(blockedRuntime);
acceptSafariVillageBounty(blockedRuntime, { choice: 0, confirmed: true });
blockedRuntime.player.party[0].hp = 0;
const blocked = startSafariVillageBounty(blockedRuntime);
assert.equal(blocked.result, false);
assert.equal(state(blockedRuntime).battle, null);
assert.equal(state(blockedRuntime).village.actions_left, 2);
assert.notEqual(state(blockedRuntime).village.active_bounty, null);
assert.equal(blocked.operations[0].key, "no_able_pokemon");

console.log(JSON.stringify({
  vertical: "village_bounty_accept_battle_money_persistence_return",
  money: runtime.bag.money,
  actionsLeft: state(runtime).village.actions_left,
  captureParty: captureRuntime.player.party.length,
  blockedRollback: true,
}));

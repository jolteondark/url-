import assert from "node:assert/strict";
import { createSafariPlayableRuntime, loadSafariPlayableRun, saveSafariPlayableRun } from "../runtime/safari-web-startup.js";
import { MAPLESS_TAVERN_LEAD_INFORMATION_COST_V108, MAPLESS_TAVERN_REST_COST_V108, openSafariTavernTouch, resolveSafariTavernAction } from "../runtime/safari-tavern-interaction.js";

function storage() {
  const values = new Map();
  return {
    getItem:key => values.has(key) ? values.get(key) : null,
    setItem:(key, value) => values.set(key, String(value)),
    removeItem:key => values.delete(key),
  };
}

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.day = 13;
state.board_events = [
  {kind:"type_event"},{kind:"miner"},{kind:"wild"},{kind:"tavern"},{kind:"shop"},{kind:"trainer"},{kind:"next_day"},{kind:"buried_item"},
];
state.board_revealed = Array(8).fill(false);
state.board_visited = Array(8).fill(false);
state.board_consumed = Array(8).fill(false);
runtime.bag.money = 5000;
runtime.player.party[0].hp = 10;
runtime.player.party[0].status = "POISON";
runtime.player.party[0].moves[0].pp = 1;

const originalDocument = globalThis.document;
globalThis.document = {};
try {
  const ready = openSafariTavernTouch(runtime, 3);
  assert.equal(ready.result, "tavern_ready");
  assert.deepEqual(ready.availableActions, ["rest","gossip","tracking","leave"]);
  assert.equal(state.board_visited[3], true);
  assert.equal(state.board_consumed[3], false);
  assert.equal(globalThis.__maplessNormalEventUi.eventId, "tavern");
  assert.deepEqual(globalThis.__maplessNormalEventUi.actions.map((action) => action.id), ["rest","gossip","tracking","leave"]);

  const rested = resolveSafariTavernAction(runtime, 3, "rest");
  assert.equal(rested.result, "rested");
  assert.equal(runtime.bag.money, 5000 - MAPLESS_TAVERN_REST_COST_V108);
  assert.equal(runtime.player.party[0].hp, 17, "Tavern rest heals floor(maxHP/4)");
  assert.equal(runtime.player.party[0].status, "NONE");
  assert.equal(runtime.player.party[0].moves[0].pp, 8, "Tavern rest restores floor(totalPP/5)");
  assert.equal(state.board_events[3].tavern_rest_used, true);
  assert.equal(state.board_consumed[3], false, "Tavern remains reusable after resting");
  assert.equal(rested.persistenceRequested, true);

  const moneyAfterRest = runtime.bag.money;
  const hpAfterRest = runtime.player.party[0].hp;
  const duplicate = resolveSafariTavernAction(runtime, 3, "rest");
  assert.equal(duplicate.result, "already_rested");
  assert.equal(runtime.bag.money, moneyAfterRest);
  assert.equal(runtime.player.party[0].hp, hpAfterRest);

  const gossip = resolveSafariTavernAction(runtime, 3, "gossip", { randomInt:() => 0 });
  assert.equal(gossip.result, "gossip");
  assert.equal(gossip.rumorIndex, 0);
  assert.match(state.notice, /増水した川/);

  state.active_lead_id = "TEAM_ROCKET";
  state.active_lead_source_org = "TEAM_ROCKET";
  state.active_lead_phase = 1;
  state.active_lead_obtained_day = 12;
  state.active_lead_confirmed_day = 0;
  const tracking = resolveSafariTavernAction(runtime, 3, "tracking");
  assert.equal(tracking.result, "tracking_menu");
  assert.deepEqual(globalThis.__maplessNormalEventUi.actions.map((action) => action.id), ["tracking:buy","tracking:summary","tracking:abandon","tracking:back"]);

  const confirmed = resolveSafariTavernAction(runtime, 3, "tracking:buy");
  assert.equal(confirmed.result, "lead_confirmed");
  assert.equal(runtime.bag.money, moneyAfterRest - MAPLESS_TAVERN_LEAD_INFORMATION_COST_V108);
  assert.equal(state.active_lead_phase, 2);
  assert.equal(state.active_lead_confirmed_day, 13);
  assert.equal(confirmed.persistenceRequested, true);

  const saved = storage();
  saveSafariPlayableRun(saved, runtime);
  const loaded = loadSafariPlayableRun(saved, createSafariPlayableRuntime());
  assert.equal(loaded.found, true);
  assert.equal(loaded.state.variables.mapless.board_events[3].tavern_rest_used, true, "Tavern one-rest flag must survive fresh Continue");
  assert.equal(loaded.state.variables.mapless.active_lead_id, "TEAM_ROCKET");
  assert.equal(loaded.state.variables.mapless.active_lead_phase, 2, "confirmed lead must survive fresh Continue");
  assert.equal(loaded.state.variables.mapless.active_lead_confirmed_day, 13);

  const summary = resolveSafariTavernAction(runtime, 3, "tracking:summary");
  assert.equal(summary.result, "tracking_summary");
  assert.match(state.notice, /禁断研究/);
  const abandoned = resolveSafariTavernAction(runtime, 3, "tracking:abandon");
  assert.equal(abandoned.result, "lead_abandoned");
  assert.equal(state.active_lead_id, null);
  assert.equal(state.active_lead_phase, 0);
  assert.equal(abandoned.persistenceRequested, true);

  const left = resolveSafariTavernAction(runtime, 3, "leave");
  assert.equal(left.completed, true);
  assert.equal(left.consumed, false, "leaving Tavern must never consume the reusable Board cell");
} finally {
  globalThis.__maplessNormalEventUi = null;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}

console.log("Safari Tavern touch owner smoke: PASS");

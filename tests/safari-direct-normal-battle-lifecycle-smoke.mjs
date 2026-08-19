import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

const facadeSource = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
assert.match(facadeSource, /safari-normal-battle-lifecycle\.js/,
  "normal capture/return must load the direct lifecycle owner");
assert.doesNotMatch(facadeSource, /normalLifecycleModulePromise\s*=\s*import\("\.\/safari-playable-integration-pre-wounded\.js"\)/,
  "normal capture/return must not re-enter the pre-wounded migration chain");
assert.match(facadeSource, /useSafariNormalBattleItem/,
  "normal BattleUse must expose the shared direct lifecycle owner");
assert.match(facadeSource, /commitSafariNormalTerminalRewardGrowth/,
  "normal Fight terminal mutations must be committed by the central REWARD_GROWTH callback");
const finalizeSource = fs.readFileSync(new URL("../runtime/safari-normal-battle-finalize.js", import.meta.url), "utf8");
assert.doesNotMatch(finalizeSource, /\bbattle\.completed\s*=\s*true\b/,
  "normal terminal mechanics finalizer must not publish completion before the central RESULT boundary");
assert.match(finalizeSource, /battle\.phase !== "REWARD_GROWTH"/,
  "normal terminal reward/Board/save mutations must be blocked before REWARD_GROWTH");
assert.match(finalizeSource, /normal_terminal_reward_growth_committed/,
  "normal terminal REWARD_GROWTH commit must be guarded exactly once");

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function quantity(runtime, id) {
  return (runtime.bag.slots ?? []).reduce((sum, slot) => sum + (slot?.[0] === id ? Number(slot[1]) : 0), 0);
}

const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";

const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);

const partyBefore = runtime.player.party.length;
const storedBefore = runtime.storage_system.boxes.reduce(
  (sum, box) => sum + box.slots.filter(Boolean).length,
  0,
);

const capture = await web.attemptSafariCapture(runtime, { randomValues: [0, 0, 0, 0] });
assert.equal(capture.result, "caught", "explicit deterministic capture fixture must be caught");
assert.equal(state.battle.completed, true, "caught wild must complete Battle");
assert.equal(state.battle.phase, "RESULT", "public capture completion must be exposed at the central RESULT phase");
assert.equal(state.battle.completed_phase, "RESULT", "RESULT must own the externally visible completion flag");
assert.equal(state.battle.decision, 4, "capture must retain canonical capture decision");
assert.equal(state.battle.captured, true);
assert.equal(state.board_consumed[0], true, "capture must complete the Board wild event");
assert.match(state.notice, /捕まえました。$/, "capture completion must not be reported as defeat");
assert.ok(
  runtime.player.party.length > partyBefore || runtime.storage_system.boxes.reduce((sum, box) => sum + box.slots.filter(Boolean).length, 0) > storedBefore,
  "caught Pokemon must route to Party or Storage",
);
assert.ok(capture.presentation.some((event) => event.type === "capture" && event.result === "caught"));
assert.ok(capture.presentation.some((event) => event.type === "battle_result" && event.captured === true && event.decision === 4));

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.result, "returned");
assert.equal(returned.target, "day_board");
assert.equal(returned.summary.decision, 4);
assert.equal(returned.summary.captured, true);
assert.equal(state.battle, null);
assert.equal(state.location, "day_board");
assert.equal(state.notice, "Day Boardへ戻りました。");

function stabilizeActiveBattle(runtime) {
  const state = runtime.variables.mapless;
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  player.max_hp = 999;
  player.hp = 100;
  player.stats.DEFENSE = 999;
  player.stats.SPECIAL_DEFENSE = 999;
  const foe = battle.foe;
  foe.max_hp = 999;
  foe.hp = 999;
  foe.stats.ATTACK = 1;
  foe.stats.SPECIAL_ATTACK = 1;
  foe.stats.DEFENSE = 999;
  foe.stats.SPECIAL_DEFENSE = 999;
  if (battle.kind === "trainer") battle.trainer_party[battle.trainer_party_index] = structuredClone(foe);
  return { state, battle, player, foe };
}

async function startPotionBattle(kind) {
  const runtime = web.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = kind === "trainer"
    ? { kind: "trainer", trainer_seed: 12345, slot: 0 }
    : { kind: "wild", type: "BUG", slot: 0 };
  state.board_revealed[0] = true;
  state.board_consumed[0] = false;
  state.board_visited[0] = false;
  state.location = "day_board";
  runtime.bag.slots = [["POTION", 3]];
  const start = await web.activateSafariDayBoardCell(runtime, 0);
  assert.equal(start.result, "dispatched");
  const stable = stabilizeActiveBattle(runtime);
  return { runtime, ...stable };
}

for (const kind of ["wild", "trainer"]) {
  const { runtime, state, battle, player, foe } = await startPotionBattle(kind);
  const playerMovePpBefore = Number(player.moves[0].pp);
  const foePpBefore = new Map(foe.moves.map((move) => [moveId(move), Number(move.pp)]));
  const turnBefore = Number(battle.turn);
  const potionBefore = quantity(runtime, "POTION");
  const item = await web.useSafariBattleItem(runtime, { itemId: "POTION", partyIndex: battle.player_party_index });
  assert.equal(item.result, "used", `${kind} Battle Potion must use the shared owner`);
  assert.equal(item.hpAfter - item.hpBefore, 20, `${kind} Battle Potion must restore exactly 20 HP before the foe response`);
  assert.equal(quantity(runtime, "POTION"), potionBefore - 1, `${kind} successful Battle Potion must consume exactly one item`);
  assert.equal(item.turnConsumed, true);
  assert.equal(item.turnAfter, turnBefore + 1, `${kind} successful Battle Potion must advance exactly one Battle turn`);
  assert.equal(Number(runtime.player.party[battle.player_party_index].moves[0].pp), playerMovePpBefore,
    `${kind} Battle Potion must not consume a player move PP`);
  const selectedFoeMoveId = item.opponentResponse.opponentChoice?.moveId;
  assert.ok(selectedFoeMoveId && foePpBefore.has(selectedFoeMoveId), `${kind} foe response must report its Battle-owned move choice`);
  const selectedAfter = battle.foe.moves.find((move) => moveId(move) === selectedFoeMoveId);
  assert.equal(Number(selectedAfter?.pp), foePpBefore.get(selectedFoeMoveId) - 1,
    `${kind} Battle Potion must allow exactly one PP consumption for the selected foe move`);
  assert.equal(state.board_consumed[0], false, `${kind} nonterminal Battle Potion turn must not consume the Board cell`);
  assert.equal(item.opponentResponse.playerActionConsumedWithoutMove, true,
    `${kind} Potion response must use the common consumed-without-move Battle contract`);

  const turnAfterUse = Number(battle.turn);
  const potionAfterUse = quantity(runtime, "POTION");
  runtime.player.party[battle.player_party_index].hp = runtime.player.party[battle.player_party_index].max_hp;
  const noEffect = await web.useSafariBattleItem(runtime, { itemId: "POTION", partyIndex: battle.player_party_index });
  assert.equal(noEffect.result, "no_effect");
  assert.equal(noEffect.turnConsumed, false, `${kind} full-HP Potion must not consume the turn`);
  assert.equal(Number(battle.turn), turnAfterUse);
  assert.equal(quantity(runtime, "POTION"), potionAfterUse);

  runtime.player.party[battle.player_party_index].hp = 0;
  const fainted = await web.useSafariBattleItem(runtime, { itemId: "POTION", partyIndex: battle.player_party_index });
  assert.equal(fainted.result, "fainted_target");
  assert.equal(fainted.turnConsumed, false, `${kind} Potion must not revive or consume the turn`);
  assert.equal(Number(battle.turn), turnAfterUse);
  assert.equal(quantity(runtime, "POTION"), potionAfterUse);

  runtime.player.party[battle.player_party_index].hp = 100;
  runtime.bag.slots = [];
  const missing = await web.useSafariBattleItem(runtime, { itemId: "POTION", partyIndex: battle.player_party_index });
  assert.equal(missing.result, "item_missing");
  assert.equal(missing.turnConsumed, false, `${kind} missing Potion must not consume the turn`);
  assert.equal(Number(battle.turn), turnAfterUse);
  assert.equal(quantity(runtime, "POTION"), potionAfterUse);
}

console.log("Safari direct normal lifecycle: capture plus shared Battle Potion -> foe-only single turn across wild/trainer: ok");

import * as base from "./safari-playable-integration-legacy.js";
import { hydrateSafariNormalEventCells } from "./mapless-normal-event-v108-preparation.js";
import { resolveMachineGachaBagEconomyIntegration } from "./bag-economy-machine-gacha-integration.js";
import { resolveBrowserOpponentMoveChoiceCanonical } from "./battle-core-browser-opponent-move-choice.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";

export * from "./safari-playable-integration-legacy.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function hydrate(runtime) {
  hydrateSafariNormalEventCells(runtime);
  return runtime;
}

export function createSafariPlayableRuntime() {
  return hydrate(base.createSafariPlayableRuntime());
}

export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = base.loadSafariPlayableRun(storage, currentRuntime);
  if (loaded.found) hydrate(loaded.state);
  return loaded;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function opponentAiSeed(state, battle) {
  const turn = Math.max(1, Math.trunc(Number(battle?.turn ?? 1)));
  const ownerSeed = battle?.kind === "trainer"
    ? Number(battle?.trainer_seed ?? 0)
    : (Math.imul(Math.max(1, Math.trunc(Number(state?.day ?? 1))), 1_000_003) ^ Math.imul(Number(battle?.board_index ?? 0) + 1, 97_409));
  return (Number(ownerSeed) ^ Math.imul(turn, 0x45d9f3b)) & 0x7fffffff;
}

function trainerUsesPartyAwareOwnedOpponent(battle) {
  return battle?.kind === "trainer"
    && Array.isArray(battle.trainer_party)
    && Number.isInteger(Number(battle.trainer_party_index))
    && battle.trainer_party.some((pokemon, index) =>
      index !== Number(battle.trainer_party_index) && Number(pokemon?.hp ?? 0) > 0);
}

function restoreMoveOrder(foe, originalIds) {
  if (!foe || !Array.isArray(foe.moves)) return;
  const buckets = new Map();
  for (const move of foe.moves) {
    const id = moveId(move);
    const bucket = buckets.get(id) ?? [];
    bucket.push(move);
    buckets.set(id, bucket);
  }
  const restored = [];
  for (const id of originalIds) {
    const bucket = buckets.get(id);
    if (bucket?.length) restored.push(bucket.shift());
  }
  for (const bucket of buckets.values()) restored.push(...bucket);
  if (restored.length === foe.moves.length) foe.moves = restored;
}

function prepareOwnedOpponentMove(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) return null;
  if (trainerUsesPartyAwareOwnedOpponent(battle)) return null;
  const player = runtime.player?.party?.[0];
  if (!player) throw new Error("active player Pokemon is required for Battle-owned opponent choice");
  const originalMoves = [...(battle.foe?.moves ?? [])];
  const originalIds = originalMoves.map(moveId);
  const playerReserveCount = Math.max(0, (runtime.player?.party ?? []).filter((pokemon) => Number(pokemon?.hp ?? 0) > 0).length - 1);
  const foeReserveCount = battle.kind === "trainer" && Array.isArray(battle.trainer_party)
    ? Math.max(0, battle.trainer_party.length - Number(battle.trainer_party_index ?? 0) - 1)
    : 0;
  const resolution = resolveBrowserOpponentMoveChoiceCanonical({
    battleKind: battle.kind,
    player,
    foe: battle.foe,
    moveMasters: SAFARI_MOVE_MASTERS,
    aiRandomSeed: opponentAiSeed(state, battle),
    trainerSkill: Number(battle.skill_level ?? 0),
    trainerFlags: Array.isArray(battle.trainer_flags) ? battle.trainer_flags : [],
    ownReserveCount: foeReserveCount,
    foeReserveCount: playerReserveCount,
    mechanicsGeneration: 9,
    turnCount: Math.max(0, Number(battle.turn ?? 1) - 1),
    canSwitchLax: false,
  });
  const selected = originalMoves[resolution.moveIndex];
  if (!selected) throw new RangeError("Battle-owned opponent choice selected an invalid Safari move index");
  battle.foe.moves = [selected, ...originalMoves.filter((_, index) => index !== resolution.moveIndex)];
  return {
    resolution,
    selectedMoveId: moveId(selected),
    originalIds,
    battleKind: battle.kind,
    trainerPartyIndex: battle.trainer_party_index,
    foeSpecies: battle.foe.species,
  };
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const prepared = prepareOwnedOpponentMove(runtime);
  const result = base.resolveSafariBattleRound(runtime, selectedMoveId);
  if (!prepared) return result;
  const battle = stateOf(runtime).battle;
  if (battle
    && battle.kind === prepared.battleKind
    && battle.trainer_party_index === prepared.trainerPartyIndex
    && battle.foe?.species === prepared.foeSpecies) {
    restoreMoveOrder(battle.foe, prepared.originalIds);
  }
  return {
    ...result,
    opponentChoice: {
      selectedMoveId: prepared.selectedMoveId,
      command: prepared.resolution.command,
      reason: prepared.resolution.reason,
      choices: prepared.resolution.choices,
      weightedChoices: prepared.resolution.weightedChoices,
      randomRolls: prepared.resolution.randomRolls,
    },
  };
}

function commitMachineSnapshot(runtime, index, resolved, keepOpen) {
  const state = stateOf(runtime);
  const event = resolved.facility.event;
  event.normal_resolved = !keepOpen;
  state.board_events[index] = event;
  runtime.bag.slots = resolved.slots;
  runtime.bag.money = resolved.money;
  state.last_operations = [
    ...(resolved.facility.operations ?? []).filter((op) => op.op !== "leave_event"),
    ...(resolved.bagOperations ?? []),
  ];
  if (!keepOpen) state.board_consumed[index] = true;
  return event;
}

export function resolveSafariMachineGachaInteraction(runtime, index, decisions = []) {
  const state = stateOf(runtime);
  hydrate(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "machine_gacha") {
    throw new Error("machine_gacha board event is required");
  }
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  state.board_revealed[index] = true;
  if (state.board_consumed[index]) return { runtime, result: "already_consumed", operations: [] };

  const operations = [];
  const rewards = [];
  let result = "left_without_use";
  let draws = 0;
  for (const decision of decisions) {
    if (decision !== "buy") {
      state.board_consumed[index] = true;
      state.board_events[index] = { ...state.board_events[index], normal_resolved: true };
      result = draws > 0 ? "used" : "left_without_use";
      break;
    }
    const resolved = resolveMachineGachaBagEconomyIntegration({
      event: state.board_events[index],
      choices: ["buy", "leave"],
      slots: runtime.bag.slots,
      money: runtime.bag.money,
      maxSlots: 20,
      maxPerSlot: 99,
      maxMoney: 999999,
    });
    const reward = resolved.facility.operations.find((op) => op.op === "machine_item_reward")?.item ?? null;
    const canContinue = resolved.draws > 0 && resolved.outcome === "used" && Number(resolved.facility.event.normal_data.machine_index) < resolved.facility.event.normal_data.machine_stock.length;
    commitMachineSnapshot(runtime, index, resolved, canContinue);
    operations.push(...state.last_operations);
    if (reward) rewards.push(reward);
    draws += resolved.draws;
    result = resolved.outcome;
    if (!canContinue) break;
  }
  state.notice = rewards.length > 0
    ? `技術端末から${rewards[rewards.length - 1]}を受け取りました。`
    : result === "insufficient_money" ? "お金が足りません。"
      : result === "bag_full" ? "バッグに空きがありません。"
        : result === "empty" ? "端末内の技術データは空です。"
          : "技術端末の前に立っています。";
  return { runtime, result, draws, rewards, operations, notice: state.notice };
}

function interactiveMachineGacha(runtime, index) {
  const state = stateOf(runtime);
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  const alertFn = typeof globalThis.alert === "function" ? globalThis.alert.bind(globalThis) : null;
  if (!confirmFn) {
    state.board_revealed[index] = true;
    state.notice = "壊れかけの技術端末。1500円で技マシンを1つ出力できます。";
    return { runtime, result: "machine_gacha_ready", boundary: "normal_event", notice: state.notice, operations: [] };
  }
  let aggregate = { runtime, result: "left_without_use", draws: 0, rewards: [], operations: [] };
  while (!state.board_consumed[index]) {
    const buy = confirmFn("壊れかけの技術端末\n1500円を投入して技マシンを1つ出力しますか？\n（キャンセルで立ち去る）");
    if (!buy) {
      const left = resolveSafariMachineGachaInteraction(runtime, index, ["leave"]);
      aggregate = { ...left, draws: aggregate.draws, rewards: aggregate.rewards, operations: [...aggregate.operations, ...left.operations] };
      break;
    }
    const step = resolveSafariMachineGachaInteraction(runtime, index, ["buy"]);
    aggregate.draws += step.draws;
    aggregate.rewards.push(...step.rewards);
    aggregate.operations.push(...step.operations);
    aggregate.result = step.result;
    if (step.rewards.length && alertFn) alertFn(`${step.rewards[step.rewards.length - 1]}を1つ受け取りました。`);
    if (state.board_consumed[index]) {
      if (step.result === "insufficient_money" && alertFn) alertFn("お金が足りません。");
      else if (step.result === "bag_full" && alertFn) alertFn("バッグに空きがありません。");
      else if (step.result === "empty" && alertFn) alertFn("端末内の有効な技術データはすべて出力されました。");
      break;
    }
  }
  state.notice = aggregate.rewards.length
    ? `技術端末の利用を終えました。最後の出力: ${aggregate.rewards[aggregate.rewards.length - 1]}`
    : "技術端末を使わず立ち去りました。";
  return { ...aggregate, boundary: "normal_event", notice: state.notice };
}

export function activateSafariDayBoardCell(runtime, index) {
  hydrate(runtime);
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (event?.kind === "normal_event") {
    state.board_revealed[index] = true;
    if (event.normal_event_id === "machine_gacha") return interactiveMachineGacha(runtime, index);
    state.notice = `${event.normal_event_id} はSafari接続待ちです。`;
    return {
      runtime,
      result: "external_request",
      boundary: "normal_event",
      notice: state.notice,
      operations: [{ op: "request_external_normal_event", index, event_id: event.normal_event_id }],
    };
  }
  const result = base.activateSafariDayBoardCell(runtime, index);
  hydrate(runtime);
  return result;
}

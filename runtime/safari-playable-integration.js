import * as core from "./safari-playable-integration-core.js";
import { setMoney } from "./bag-economy-mart-flow.js";

export * from "./safari-playable-integration-core.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function trainerHasNext(battle) {
  return battle?.kind === "trainer"
    && Array.isArray(battle.trainer_party)
    && Number.isInteger(battle.trainer_party_index)
    && battle.trainer_party_index + 1 < battle.trainer_party.length;
}

function snapshotRoundSideEffects(runtime, state) {
  return {
    bagSlots: structuredClone(runtime.bag.slots),
    bagMoney: Number(runtime.bag.money ?? 0),
    boardEvents: structuredClone(state.board_events),
    boardRevealed: structuredClone(state.board_revealed),
    boardConsumed: structuredClone(state.board_consumed),
    boardVisited: structuredClone(state.board_visited),
  };
}

function restoreIntermediateSideEffects(runtime, state, snapshot) {
  runtime.bag.slots = snapshot.bagSlots;
  runtime.bag.money = snapshot.bagMoney;
  state.board_events = snapshot.boardEvents;
  state.board_revealed = snapshot.boardRevealed;
  state.board_consumed = snapshot.boardConsumed;
  state.board_visited = snapshot.boardVisited;
}

function payTrainerPrize(runtime, state, result) {
  const battle = state.battle;
  if (battle?.kind !== "trainer" || battle.decision !== 1) return result;
  if (battle.trainer_prize_paid) return result;

  const requested = Math.max(0, Math.trunc(Number(battle.prize_money ?? 0)));
  const before = Number(runtime.bag.money ?? 0);
  runtime.bag.money = setMoney(before + requested, 999999);
  const gained = runtime.bag.money - before;
  battle.trainer_prize_paid = true;
  battle.money_gained = gained;

  const moneyOperation = {
    op: "trainer_prize_money",
    requested,
    applied: gained,
    trainer: battle.trainer?.trainer_full_name ?? null,
  };
  battle.last_operations = [...(battle.last_operations ?? []), moneyOperation];
  state.last_operations = [...(state.last_operations ?? []), moneyOperation];

  const cumulativeExp = Number(battle.trainer_exp_gained ?? 0) + Number(battle.exp_gained ?? 0);
  battle.exp_gained = cumulativeExp;
  battle.presentation = (battle.presentation ?? []).map((event) => event.type === "battle_result"
    ? { ...event, expGained: cumulativeExp, moneyGained: gained }
    : event);

  const trainerName = battle.trainer?.trainer_full_name ?? "トレーナー";
  state.notice = `${trainerName}に勝利し、賞金${gained}円を受け取りました。`;
  return {
    ...result,
    operations: battle.last_operations,
    presentation: battle.presentation,
    persistenceRequested: result.persistenceRequested,
  };
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");

  if (!trainerHasNext(battle)) {
    return payTrainerPrize(runtime, state, core.resolveSafariBattleRound(runtime, selectedMoveId));
  }

  const snapshot = snapshotRoundSideEffects(runtime, state);
  const result = core.resolveSafariBattleRound(runtime, selectedMoveId);

  // A player loss is final even if the trainer still had reserves.
  if (result.decision !== 1) return result;

  const gainedExp = Number(state.battle.exp_gained ?? 0);
  const cumulativeExp = Number(state.battle.trainer_exp_gained ?? 0) + gainedExp;
  restoreIntermediateSideEffects(runtime, state, snapshot);

  const nextIndex = state.battle.trainer_party_index + 1;
  const nextFoe = structuredClone(state.battle.trainer_party[nextIndex]);
  state.battle.trainer_party_index = nextIndex;
  state.battle.trainer_exp_gained = cumulativeExp;
  state.battle.foe = nextFoe;
  state.battle.decision = 0;
  state.battle.completed = false;
  state.battle.captured = false;
  state.battle.reward = null;
  state.battle.exp_gained = 0;
  state.battle.money_gained = 0;

  const trainerName = state.battle.trainer?.trainer_full_name ?? "トレーナー";
  const switchOperation = {
    op: "trainer_send_next",
    trainer: trainerName,
    partyIndex: nextIndex,
    species: nextFoe.species,
  };
  state.battle.last_operations = [...(result.operations ?? []).filter((operation) => operation.scope !== "reward"), switchOperation];
  state.battle.presentation = [
    ...(result.presentation ?? []).filter((event) => event.type !== "battle_result"),
    { type: "trainer_next", actor: "foe", trainer: trainerName, species: nextFoe.species, partyIndex: nextIndex },
  ];
  state.last_operations = state.battle.last_operations;
  state.notice = `${trainerName}は${nextFoe.species}を繰り出した！`;

  return {
    ...result,
    decision: 0,
    operations: state.battle.last_operations,
    presentation: state.battle.presentation,
    persistenceRequested: false,
  };
}

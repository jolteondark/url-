import { cloneGameState } from './game-state.js';

function result(state, events = [], effects = []) { return { state, events, effects }; }
function exactNonnegativeInteger(value, boundary) {
  const number = Number(value ?? 0);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${boundary} requires a non-negative integer`);
  return number;
}
function stableMemberId(member) {
  const raw = member?.id ?? member?.personalId;
  if (raw === undefined || raw === null || String(raw) === '') throw new Error('reward EXP requires stable party member ids');
  return String(raw);
}
function diagnosticsArray(state, key) {
  state.diagnostics ??= {};
  state.diagnostics[key] ??= [];
  if (!Array.isArray(state.diagnostics[key])) throw new Error(`New Core diagnostics.${key} must be an array`);
  return state.diagnostics[key];
}
function normalizePartyExp(gains = []) {
  if (!Array.isArray(gains)) throw new Error('partyExp must be an array');
  return gains.map((entry) => {
    const memberId = String(entry?.memberId ?? '');
    if (!memberId) throw new Error('partyExp entry requires memberId');
    return { memberId, exp: exactNonnegativeInteger(entry.exp, `partyExp for ${memberId}`) };
  });
}
function applyPartyExp(party, gains) {
  const gainById = new Map();
  for (const entry of gains) {
    if (gainById.has(entry.memberId)) throw new Error(`duplicate partyExp memberId: ${entry.memberId}`);
    gainById.set(entry.memberId, entry.exp);
  }
  const knownIds = new Set(party.map(stableMemberId));
  for (const memberId of gainById.keys()) if (!knownIds.has(memberId)) throw new Error(`partyExp targets unknown member: ${memberId}`);
  return party.map((member) => {
    const memberId = stableMemberId(member);
    const gain = gainById.get(memberId) ?? 0;
    if (!gain) return member;
    const current = exactNonnegativeInteger(member.exp, `persistent EXP for ${memberId}`);
    return { ...member, exp: current + gain };
  });
}
function battleOutcomeEvent(outcome, battleId) {
  if (outcome === 'win') return { type: 'BATTLE_WON', battleId };
  if (outcome === 'loss') return { type: 'BATTLE_LOST', battleId };
  return null;
}

export function step(inputState, command) {
  if (!inputState || !command?.type) throw new Error('state and command.type are required');
  const state = cloneGameState(inputState);

  switch (command.type) {
    case 'BOARD_GENERATED': {
      if (!Array.isArray(command.slots) || command.slots.length !== 8) throw new Error('canonical Day Board requires 8 slots');
      if (state.activeBattle || state.pendingBattleResult) throw new Error('BOARD_GENERATED cannot replace an unresolved battle result');
      state.board = command.slots.map((slot, index) => ({ ...structuredClone(slot), slot: index, consumed: false }));
      state.boardSelectionsRemaining = 8;
      state.mode = 'board';
      state.location = 'day_board';
      return result(state, [{ type: 'BOARD_READY', day: state.day }]);
    }
    case 'BOARD_SELECT': {
      if (state.mode !== 'board' || !state.board) throw new Error('BOARD_SELECT requires an active board');
      const slot = state.board[command.slot];
      if (!slot || slot.consumed) throw new Error('board slot unavailable');
      if (slot.kind !== 'wild') return result(state, [{ type: 'BOARD_SELECTION_DEFERRED', slot: command.slot, kind: slot.kind }]);
      const battleId = `${state.runId}:d${state.day}:s${command.slot}`;
      state.activeEncounter = { id: battleId, kind: 'wild', slot: command.slot, encounter: structuredClone(slot.encounter ?? null) };
      state.activeBattle = { id: battleId, status: 'requested', resultCommitted: false };
      state.mode = 'battle_pending';
      return result(state, [
        { type: 'ENCOUNTER_STARTED', encounterId: battleId, kind: 'wild' },
        { type: 'BATTLE_REQUESTED', battleId, encounter: structuredClone(state.activeEncounter) },
      ]);
    }
    case 'BATTLE_TERMINAL_RESULT': {
      const resultId = String(command.resultId || '');
      if (!resultId) throw new Error('resultId is required for exactly-once commit');
      const appliedResults = diagnosticsArray(state, 'appliedResultIds');
      if (appliedResults.includes(resultId)) return result(state, [{ type: 'BATTLE_RESULT_REPLAY_IGNORED', resultId }]);
      const battle = state.activeBattle;
      if (!battle || battle.id !== command.battleId) throw new Error('terminal result does not match active battle');
      const outcome = String(command.outcome ?? '');
      if (!outcome) throw new Error('terminal result outcome is required');
      const slotIndex = state.activeEncounter?.slot;
      if (Number.isInteger(slotIndex) && state.board?.[slotIndex] && !state.board[slotIndex].consumed) {
        state.board[slotIndex].consumed = true;
        state.boardSelectionsRemaining = Math.max(0, state.boardSelectionsRemaining - 1);
      }
      appliedResults.push(resultId);
      state.activeBattle = null;
      state.activeEncounter = null;
      const outcomeEvent = battleOutcomeEvent(outcome, command.battleId);
      if (outcome === 'win') {
        const rewardId = `${resultId}:reward`;
        state.pendingBattleResult = { battleId: command.battleId, resultId, rewardId, outcome };
        state.mode = 'battle_result';
        return result(state, [
          { type: 'BATTLE_RESULT_COMMITTED', battleId: command.battleId, resultId, outcome },
          ...(outcomeEvent ? [outcomeEvent] : []),
          { type: 'BATTLE_REWARD_REQUESTED', battleId: command.battleId, resultId, rewardId },
        ]);
      }
      state.pendingBattleResult = null;
      state.mode = 'board';
      state.location = 'day_board';
      return result(state, [
        { type: 'BATTLE_RESULT_COMMITTED', battleId: command.battleId, resultId, outcome },
        ...(outcomeEvent ? [outcomeEvent] : []),
        { type: 'BOARD_RETURNED', day: state.day },
      ], [{ type: 'REQUEST_SAVE', reason: 'battle_terminal_result' }]);
    }
    case 'BATTLE_REWARD_RESULT': {
      const rewardId = String(command.rewardId || '');
      if (!rewardId) throw new Error('rewardId is required for exactly-once reward commit');
      const appliedRewards = diagnosticsArray(state, 'appliedRewardIds');
      if (appliedRewards.includes(rewardId)) return result(state, [{ type: 'BATTLE_REWARD_REPLAY_IGNORED', rewardId }]);
      const pending = state.pendingBattleResult;
      if (!pending || pending.outcome !== 'win') throw new Error('battle reward requires a pending winning battle result');
      if (pending.rewardId !== rewardId) throw new Error('battle reward does not match pending reward id');
      const money = exactNonnegativeInteger(command.money, 'battle reward money');
      const partyExp = normalizePartyExp(command.partyExp ?? []);
      state.money += money;
      state.party = applyPartyExp(state.party, partyExp);
      appliedRewards.push(rewardId);
      state.pendingBattleResult = null;
      state.mode = 'board';
      state.location = 'day_board';
      return result(state, [
        ...partyExp.filter((entry) => entry.exp > 0).map((entry) => ({
          type: 'EXP_GAINED',
          memberId: entry.memberId,
          amount: entry.exp,
          battleId: pending.battleId,
          rewardId,
        })),
        { type: 'BATTLE_REWARD_COMMITTED', battleId: pending.battleId, resultId: pending.resultId, rewardId, money },
        { type: 'BOARD_RETURNED', day: state.day },
      ], [{ type: 'REQUEST_SAVE', reason: 'battle_reward_result' }]);
    }
    case 'ADVANCE_DAY': {
      const transitionId = String(command.transitionId || `${state.runId}:d${state.day}:advance`);
      const appliedTransitions = diagnosticsArray(state, 'appliedDayTransitionIds');
      if (appliedTransitions.includes(transitionId)) return result(state, [{ type: 'DAY_ADVANCE_REPLAY_IGNORED', transitionId }]);
      if (state.mode !== 'board' || !state.board || state.activeBattle || state.pendingBattleResult) throw new Error('ADVANCE_DAY requires a settled Day Board');
      if (command.confirmed !== true) return result(state, [{ type: 'DAY_ADVANCE_CANCELLED', day: state.day }]);
      appliedTransitions.push(transitionId);
      state.day += 1;
      state.board = null;
      state.boardSelectionsRemaining = 0;
      state.mode = 'board_pending';
      state.location = 'day_board';
      return result(state, [
        { type: 'DAY_ADVANCED', day: state.day, transitionId },
        { type: 'BOARD_GENERATION_REQUESTED', day: state.day },
      ], [{ type: 'REQUEST_SAVE', reason: 'day_advanced' }]);
    }
    default:
      throw new Error(`Unsupported New Core command: ${command.type}`);
  }
}

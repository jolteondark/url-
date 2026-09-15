import { cloneGameState } from './game-state.js';

function result(state, events = [], effects = []) { return { state, events, effects }; }

export function step(inputState, command) {
  if (!inputState || !command?.type) throw new Error('state and command.type are required');
  const state = cloneGameState(inputState);

  switch (command.type) {
    case 'BOARD_GENERATED': {
      if (!Array.isArray(command.slots) || command.slots.length !== 8) throw new Error('canonical Day Board requires 8 slots');
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
      const battle = state.activeBattle;
      if (!battle || battle.id !== command.battleId) throw new Error('terminal result does not match active battle');
      const resultId = String(command.resultId || '');
      if (!resultId) throw new Error('resultId is required for exactly-once commit');
      if (state.diagnostics.appliedResultIds.includes(resultId)) return result(state, [{ type: 'BATTLE_RESULT_REPLAY_IGNORED', resultId }]);
      const slotIndex = state.activeEncounter?.slot;
      if (Number.isInteger(slotIndex) && state.board?.[slotIndex] && !state.board[slotIndex].consumed) {
        state.board[slotIndex].consumed = true;
        state.boardSelectionsRemaining = Math.max(0, state.boardSelectionsRemaining - 1);
      }
      state.diagnostics.appliedResultIds.push(resultId);
      state.activeBattle = null;
      state.activeEncounter = null;
      state.mode = 'board';
      state.location = 'day_board';
      return result(state, [
        { type: 'BATTLE_RESULT_COMMITTED', battleId: command.battleId, resultId, outcome: command.outcome },
        { type: 'BOARD_RETURNED', day: state.day },
      ], [{ type: 'REQUEST_SAVE', reason: 'battle_terminal_result' }]);
    }
    default:
      throw new Error(`Unsupported New Core command: ${command.type}`);
  }
}

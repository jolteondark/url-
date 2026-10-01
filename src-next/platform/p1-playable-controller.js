import { drawShowdownBattleSeed, drawWildShowdownMove } from '../core/battle/battle-rng.js';
import { createShowdownBattleSnapshot, projectMaplessPartyToShowdown } from '../core/battle/showdown-roundtrip.js';
import { projectShowdownRoundSemanticEvents } from '../core/battle/showdown-semantic-events.js';
import { createShowdownStreamSession } from '../core/battle/showdown-stream-session.js';
import { commitShowdownStreamTerminal } from '../core/battle/showdown-terminal-handoff.js';
import { createFreshRunState } from '../core/run/fresh-start.js';
import { step } from '../core/step.js';
import { createPresentationQueue, enqueuePresentationEvents } from '../presentation/semantic-event-queue.js';
import { beginSafariAction, cancelSafariAction, createSafariActionGate, releaseSafariAction } from './safari-action-gate.js';
import {
  clearNewCoreBrowserRun,
  hasNewCoreBrowserSave,
  loadNewCoreBrowserRun,
  saveNewCoreBrowserRun,
} from './browser-new-core-storage.js';
import { prepareNewCoreWildBoardSlot } from './p1-wild-encounter-driver.js';

function freezeResult(value) {
  return Object.freeze(value);
}

function terminalOutcome(resolved, playerName) {
  const winner = String(resolved?.winner ?? '');
  if (!resolved?.terminal) return null;
  if (winner === playerName) return 'win';
  if (winner === 'Wild') return 'loss';
  return 'draw';
}

function activePersistentMember(party = []) {
  return party.find((member) => Number(member?.hp ?? 0) > 0 && member?.fainted !== true) ?? party[0] ?? null;
}

export function createP1PlayableController({
  showdown = null,
  storage = null,
  encounterDependencies = null,
  sessionFactory = createShowdownStreamSession,
  terminalCommit = commitShowdownStreamTerminal,
  presentationQueue = createPresentationQueue(),
  actionGate = createSafariActionGate(),
  playerName = 'Mapless',
} = {}) {
  let state = null;
  let activeBattleSession = null;

  function requireState() {
    if (!state) throw new Error('P1 playable controller requires Fresh Start or Continue');
    return state;
  }

  function publish(events = []) {
    if (events.length) enqueuePresentationEvents(presentationQueue, events);
  }

  function saveIfRequested(effects = []) {
    const requested = effects.some((effect) => effect?.type === 'REQUEST_SAVE');
    if (requested && storage) saveNewCoreBrowserRun(storage, state);
    return requested;
  }

  function applyCore(command, { save = true, publishEvents = true } = {}) {
    const resolved = step(requireState(), command);
    state = resolved.state;
    if (publishEvents) publish(resolved.events);
    if (save) saveIfRequested(resolved.effects);
    return resolved;
  }

  function freshStart({ runId, seed } = {}) {
    if (activeBattleSession) throw new Error('cannot Fresh Start during an active Showdown session');
    state = createFreshRunState({ runId, seed });
    const board = applyCore({ type: 'GENERATE_DAY_BOARD' }, { save: false });
    return freezeResult({ state, events: board.events, effects: board.effects });
  }

  function continueRun() {
    if (!storage) throw new Error('Continue requires browser storage');
    if (activeBattleSession) throw new Error('cannot Continue during an active Showdown session');
    const loaded = loadNewCoreBrowserRun(storage);
    if (!loaded.found) return loaded;
    state = loaded.state;
    if (state.mode === 'board_pending' && state.board === null) {
      applyCore({ type: 'GENERATE_DAY_BOARD' });
    }
    return freezeResult({ ...loaded, state });
  }

  async function prepareWild(slot) {
    requireState();
    if (activeBattleSession) throw new Error('cannot prepare a Board encounter during an active Showdown session');
    const prepared = await prepareNewCoreWildBoardSlot(state, slot, encounterDependencies);
    state = prepared.state;
    publish(prepared.events ?? []);
    return freezeResult({ ...prepared, state });
  }

  async function startWildBattle(slot) {
    requireState();
    if (activeBattleSession) throw new Error('Showdown session is already active');
    const boardState = state;
    const selected = applyCore({ type: 'BOARD_SELECT', slot }, { save: false, publishEvents: false });
    const battleId = state.activeBattle?.id;
    const encounter = state.activeEncounter?.encounter;
    if (!battleId || !encounter?.pokemon) {
      state = boardState;
      throw new Error('prepared wild encounter Pokemon is required for Showdown start');
    }

    try {
      const seed = drawShowdownBattleSeed(state.rngState);
      applyCore({
        type: 'BATTLE_RNG_ADVANCED',
        battleId,
        rngStateBefore: state.rngState,
        nextRngState: seed.nextRngState,
      }, { save: false, publishEvents: false });

      const playerTeam = createShowdownBattleSnapshot({ party: state.party }, { battleId }).party;
      const wildTeam = projectMaplessPartyToShowdown([encounter.pokemon]);
      const session = sessionFactory(showdown, {
        formatid: 'gen9customgame',
        seed: [...seed.seed],
        p1: { name: String(playerName), team: playerTeam },
        p2: { name: 'Wild', team: wildTeam },
      });
      if (!session || typeof session.start !== 'function' || typeof session.fight !== 'function' || typeof session.resolvedState !== 'function') {
        throw new Error('P1 Showdown session factory returned an invalid session');
      }
      await session.start();
      activeBattleSession = { battleId, session, encounter: structuredClone(encounter), seed: [...seed.seed] };

      publish(selected.events);
      const player = activePersistentMember(state.party);
      publish([
        { type: 'BATTLE_STARTED', battleId },
        { type: 'POKEMON_SENT_OUT', side: 'player', maplessId: player?.id ?? player?.personalId ?? null, species: player?.species ?? null },
        { type: 'POKEMON_SENT_OUT', side: 'foe', maplessId: encounter.pokemon.id, species: encounter.pokemon.species },
      ]);
      return freezeResult({
        state,
        battleId,
        seed: [...seed.seed],
        resolved: session.resolvedState(),
        events: selected.events,
      });
    } catch (error) {
      state = boardState;
      activeBattleSession = null;
      throw error;
    }
  }

  async function fight(moveSlot) {
    requireState();
    if (!activeBattleSession) throw new Error('FIGHT requires an active Showdown session');
    const action = beginSafariAction(actionGate, { type: 'FIGHT', moveSlot });
    if (!action) return freezeResult({ accepted: false, state, resolved: activeBattleSession.session.resolvedState() });

    try {
      const { battleId, session } = activeBattleSession;
      const before = session.resolvedState();
      if (before.terminal) throw new Error('cannot FIGHT after terminal Showdown state');
      const ai = drawWildShowdownMove(state.rngState, before.p2?.[0]?.moves ?? []);

      applyCore({
        type: 'BATTLE_RNG_ADVANCED',
        battleId,
        rngStateBefore: state.rngState,
        nextRngState: ai.nextRngState,
      }, { save: false, publishEvents: false });

      await Promise.all([
        session.fight('p1', moveSlot),
        session.fight('p2', ai.moveSlot),
      ]);

      const resolved = session.resolvedState();
      publish(projectShowdownRoundSemanticEvents(before, resolved, {
        playerMoveSlot: moveSlot,
        foeMoveSlot: ai.moveSlot,
      }));

      if (!resolved.terminal) {
        releaseSafariAction(actionGate, action.token);
        return freezeResult({
          accepted: true,
          terminal: false,
          state,
          resolved,
          opponentChoice: ai,
        });
      }

      const committed = terminalCommit(state, { battleId, session });
      if (!committed.committed && !committed.duplicate) throw new Error('terminal Showdown state was not committed');
      state = committed.state;
      const outcome = terminalOutcome(resolved, String(playerName));
      const terminal = applyCore({
        type: 'BATTLE_TERMINAL_RESULT',
        battleId,
        resultId: `showdown-terminal:${battleId}`,
        outcome,
      });
      activeBattleSession = null;
      releaseSafariAction(actionGate, action.token);
      return freezeResult({
        accepted: true,
        terminal: true,
        outcome,
        state,
        resolved,
        opponentChoice: ai,
        partyCommitted: committed.committed,
        duplicatePartyCommit: committed.duplicate,
        events: terminal.events,
        effects: terminal.effects,
      });
    } catch (error) {
      cancelSafariAction(actionGate, action.token);
      throw error;
    }
  }

  function commitReward(recipientIds = null) {
    const current = requireState();
    const pending = current.pendingBattleResult;
    if (!pending) throw new Error('no pending battle reward');
    const recipients = recipientIds ?? current.party
      .filter((member) => Number(member?.hp ?? 0) > 0 && member?.fainted !== true)
      .map((member) => String(member.id ?? member.personalId));
    const committed = applyCore({
      type: 'BATTLE_REWARD_RESULT',
      rewardId: pending.rewardId,
      recipientIds: recipients,
    });
    return freezeResult({ ...committed, state });
  }

  function advanceDay({ confirmed = true, transitionId = null } = {}) {
    requireState();
    const command = { type: 'ADVANCE_DAY', confirmed };
    if (transitionId) command.transitionId = transitionId;
    const advanced = applyCore(command, { save: false });
    if (!confirmed) return freezeResult({ ...advanced, state });
    const generationRequested = advanced.events.some((event) => event?.type === 'BOARD_GENERATION_REQUESTED');
    if (!generationRequested) return freezeResult({ ...advanced, state });

    const generated = applyCore({ type: 'GENERATE_DAY_BOARD' });
    return freezeResult({
      state,
      events: [...advanced.events, ...generated.events],
      effects: [...advanced.effects, ...generated.effects],
    });
  }

  function saveNow() {
    if (!storage) throw new Error('Save requires browser storage');
    return saveNewCoreBrowserRun(storage, requireState());
  }

  function hasSave() {
    if (!storage) return false;
    return hasNewCoreBrowserSave(storage);
  }

  function clearSave() {
    if (!storage) throw new Error('Clear Save requires browser storage');
    return clearNewCoreBrowserRun(storage);
  }

  function snapshot() {
    return structuredClone(requireState());
  }

  function activeBattle() {
    if (!activeBattleSession) return null;
    return Object.freeze({
      battleId: activeBattleSession.battleId,
      encounter: structuredClone(activeBattleSession.encounter),
      seed: [...activeBattleSession.seed],
    });
  }

  return Object.freeze({
    freshStart,
    continueRun,
    prepareWild,
    startWildBattle,
    fight,
    commitReward,
    advanceDay,
    saveNow,
    hasSave,
    clearSave,
    snapshot,
    activeBattle,
    presentationQueue,
    actionGate,
  });
}

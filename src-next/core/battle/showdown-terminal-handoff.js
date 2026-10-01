import { commitShowdownTerminalResult } from './showdown-roundtrip.js';

function terminalResultId(battleId) {
  if (!battleId) throw new Error('Showdown terminal handoff requires battleId');
  return `showdown-terminal:${String(battleId)}`;
}

/**
 * Commits the authoritative resolved p1 state from a Showdown stream session
 * into Mapless persistent party state exactly once.
 *
 * Battle mechanics remain owned by Showdown. This boundary only accepts a
 * terminal observation and delegates persistent-field/idempotency policy to
 * commitShowdownTerminalResult().
 */
export function commitShowdownStreamTerminal(state, { battleId, session }) {
  if (!session || typeof session.resolvedState !== 'function') {
    throw new Error('Showdown terminal handoff requires a resolved-state session');
  }

  const resolved = session.resolvedState();
  if (!resolved?.terminal) {
    throw new Error('Cannot commit a non-terminal Showdown stream state');
  }

  return commitShowdownTerminalResult(state, {
    terminal: true,
    resultId: terminalResultId(battleId),
    party: resolved.p1 ?? [],
  });
}

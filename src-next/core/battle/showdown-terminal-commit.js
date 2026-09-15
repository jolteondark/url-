function maplessId(member) {
  return String(member?.maplessId ?? member?.id ?? member?.personalId ?? member?.species ?? '');
}

function resolvedById(resolvedTeam) {
  const byId = new Map();
  for (const member of resolvedTeam ?? []) {
    const id = maplessId(member);
    if (!id) throw new Error('Resolved Showdown member requires maplessId');
    if (byId.has(id)) throw new Error(`Duplicate resolved Showdown maplessId: ${id}`);
    byId.set(id, member);
  }
  return byId;
}

function persistentMember(member, resolved) {
  const moves = (member.moves ?? []).map((move) => {
    const moveId = String(move?.id ?? move);
    const resolvedMove = (resolved.moves ?? []).find((candidate) => String(candidate.id) === moveId);
    if (!resolvedMove) return move;
    if (move && typeof move === 'object') return { ...move, pp: Number(resolvedMove.pp) };
    return { id: moveId, pp: Number(resolvedMove.pp) };
  });

  return {
    ...member,
    currentHp: Number(resolved.hp),
    status: String(resolved.status ?? ''),
    heldItem: String(resolved.heldItem ?? ''),
    moves,
  };
}

function commitTeam(team, resolvedTeam) {
  const byId = resolvedById(resolvedTeam);
  return (team ?? []).map((member) => {
    const id = maplessId(member);
    const resolved = byId.get(id);
    if (!resolved) throw new Error(`Missing resolved Showdown state for Mapless member: ${id}`);
    return persistentMember(member, resolved);
  });
}

/**
 * Owns the single terminal Showdown -> Mapless persistence handoff.
 * Only persistent battle state crosses this boundary: HP, status, PP and held item.
 * Volatiles, boosts, turn state and other simulator-only fields are deliberately ignored.
 */
export function createShowdownTerminalCommitter() {
  let committed = false;

  function commit(maplessBattleState, resolvedState) {
    if (committed) throw new Error('Showdown terminal state has already been committed');
    if (!resolvedState?.terminal) throw new Error('Showdown state must be terminal before commit');
    if (!maplessBattleState?.p1?.team || !maplessBattleState?.p2?.team) {
      throw new Error('Mapless battle state requires p1 and p2 teams');
    }

    const next = {
      ...maplessBattleState,
      p1: { ...maplessBattleState.p1, team: commitTeam(maplessBattleState.p1.team, resolvedState.p1) },
      p2: { ...maplessBattleState.p2, team: commitTeam(maplessBattleState.p2.team, resolvedState.p2) },
    };
    committed = true;
    return next;
  }

  return Object.freeze({
    commit,
    get committed() { return committed; },
  });
}

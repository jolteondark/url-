function assertSide(side) {
  if (side !== 'p1' && side !== 'p2') throw new Error(`Invalid Showdown side: ${side}`);
}

function stableMaplessId(member, context = 'Showdown stream session') {
  const raw = member?.maplessId ?? member?.id ?? member?.personalId;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    throw new Error(`${context} requires a stable Mapless Pokémon ID`);
  }
  return String(raw);
}

function createIdentityTransport(p1Team, p2Team) {
  const tokenToId = new Map();
  const idToToken = new Map();
  let sequence = 0;
  const projectSide = (side, team) => team.map((member) => {
    const id = stableMaplessId(member, `${side} team`);
    if (idToToken.has(id)) throw new Error(`Showdown stream session contains duplicate stable Mapless Pokémon ID: ${id}`);
    sequence += 1;
    const token = `M${String(sequence).padStart(6, '0')}`;
    tokenToId.set(token, id);
    idToToken.set(id, token);
    return Object.freeze({ member, token });
  });
  return Object.freeze({
    p1: projectSide('p1', p1Team),
    p2: projectSide('p2', p2Team),
    tokenToId,
  });
}

function normalizeTeamMember(member, identityToken) {
  if (!member?.species) throw new Error('Showdown team member requires species');
  const moves = (member.moves ?? []).map((move) => String(move.id ?? move));
  if (!moves.length) throw new Error('Showdown team member requires at least one move');
  return {
    // Battle-local token is deliberately transported through Showdown's nickname
    // field so identity survives simulator-side ordering without adding mechanics.
    name: identityToken,
    species: String(member.species),
    level: Number(member.level ?? 1),
    item: String(member.heldItem ?? member.item ?? ''),
    ability: String(member.ability ?? ''),
    moves,
  };
}

function playerCommand(side, player, packedTeam) {
  return `>player ${side} ${JSON.stringify({ name: String(player.name ?? side), team: packedTeam })}`;
}

function resolvedPokemon(pokemon, tokenToId) {
  const token = String(pokemon?.name ?? '');
  const id = tokenToId.get(token);
  if (!id) throw new Error(`Showdown resolved Pokémon has unknown Mapless identity token: ${token || '<empty>'}`);
  const moveSlots = pokemon?.moveSlots ?? [];
  return Object.freeze({
    maplessId: id,
    hp: Number(pokemon?.hp ?? 0),
    maxhp: Number(pokemon?.maxhp ?? pokemon?.maxHp ?? 0),
    status: pokemon?.status ? String(pokemon.status) : '',
    heldItem: pokemon?.item ? String(pokemon.item) : '',
    fainted: Boolean(pokemon?.fainted),
    moves: moveSlots.map((move) => Object.freeze({
      id: String(move.id ?? move.move ?? ''),
      pp: Number(move.pp ?? 0),
      maxpp: Number(move.maxpp ?? move.maxPP ?? move.pp ?? 0),
    })),
  });
}

/**
 * Creates the first executable New Core -> Showdown stream boundary.
 *
 * This module deliberately owns no Pokemon battle semantics. It only projects
 * Mapless battle inputs into Showdown's simulator protocol, submits player
 * choices, and observes the authoritative resolved simulator state.
 */
export function createShowdownStreamSession(showdown, config) {
  if (!showdown?.BattleStreams?.BattleStream || !showdown?.BattleStreams?.getPlayerStreams) {
    throw new Error('Executable Showdown BattleStreams surface is required');
  }
  if (typeof showdown?.Teams?.pack !== 'function') {
    throw new Error('Executable Showdown Teams surface is required');
  }
  if (!config?.p1?.team?.length || !config?.p2?.team?.length) {
    throw new Error('Showdown stream session requires p1 and p2 teams');
  }

  const identity = createIdentityTransport(config.p1.team, config.p2.team);
  const battleStream = new showdown.BattleStreams.BattleStream();
  const streams = showdown.BattleStreams.getPlayerStreams(battleStream);
  if (!streams?.omniscient || !streams?.p1 || !streams?.p2) {
    throw new Error('Showdown player streams are incomplete');
  }

  const formatid = String(config.formatid ?? 'gen9customgame');
  const p1Team = showdown.Teams.pack(identity.p1.map(({ member, token }) => normalizeTeamMember(member, token)));
  const p2Team = showdown.Teams.pack(identity.p2.map(({ member, token }) => normalizeTeamMember(member, token)));
  const seed = config.seed;
  const start = { formatid };
  if (seed !== undefined) start.seed = seed;

  let started = false;
  async function startBattle() {
    if (started) return false;
    started = true;
    await streams.omniscient.write(`>start ${JSON.stringify(start)}`);
    await streams.omniscient.write(playerCommand('p1', config.p1, p1Team));
    await streams.omniscient.write(playerCommand('p2', config.p2, p2Team));
    return true;
  }

  async function choose(side, choice) {
    assertSide(side);
    if (!started) throw new Error('Showdown battle must start before choices');
    if (!choice || typeof choice !== 'string') throw new Error('Showdown choice must be a non-empty string');
    await streams[side].write(choice);
  }

  async function fight(side, moveSlot) {
    const slot = Number(moveSlot);
    if (!Number.isInteger(slot) || slot < 1) throw new Error('FIGHT requires a positive Showdown move slot');
    await choose(side, `move ${slot}`);
  }

  function resolvedState() {
    if (!started || !battleStream.battle) throw new Error('Showdown battle state is not available');
    const sides = battleStream.battle.sides ?? [];
    const projectSide = (sideIndex) => {
      const pokemon = sides[sideIndex]?.pokemon ?? [];
      const seen = new Set();
      return pokemon.map((member) => {
        const resolved = resolvedPokemon(member, identity.tokenToId);
        if (seen.has(resolved.maplessId)) {
          throw new Error(`Showdown resolved side contains duplicate Mapless identity: ${resolved.maplessId}`);
        }
        seen.add(resolved.maplessId);
        return resolved;
      });
    };
    return Object.freeze({
      terminal: Boolean(battleStream.battle.ended),
      winner: battleStream.battle.winner ? String(battleStream.battle.winner) : '',
      turn: Number(battleStream.battle.turn ?? 0),
      p1: projectSide(0),
      p2: projectSide(1),
    });
  }

  return Object.freeze({
    battleStream,
    streams,
    start: startBattle,
    choose,
    fight,
    resolvedState,
  });
}

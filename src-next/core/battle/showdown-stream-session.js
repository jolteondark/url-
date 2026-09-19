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

function moveId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function createIdentityTransport(p1Team, p2Team) {
  const tokenToId = new Map();
  const tokenToMember = new Map();
  const idToToken = new Map();
  let sequence = 0;
  const projectSide = (side, team) => team.map((member) => {
    const id = stableMaplessId(member, `${side} team`);
    if (idToToken.has(id)) throw new Error(`Showdown stream session contains duplicate stable Mapless Pokémon ID: ${id}`);
    sequence += 1;
    const token = `M${String(sequence).padStart(6, '0')}`;
    tokenToId.set(token, id);
    tokenToMember.set(token, member);
    idToToken.set(id, token);
    return Object.freeze({ member, token });
  });
  return Object.freeze({
    p1: projectSide('p1', p1Team),
    p2: projectSide('p2', p2Team),
    tokenToId,
    tokenToMember,
  });
}

function normalizeTeamMember(member, identityToken) {
  if (!member?.species) throw new Error('Showdown team member requires species');
  const moves = (member.moves ?? []).map((move) => String(move.id ?? move));
  if (!moves.length) throw new Error('Showdown team member requires at least one move');
  return {
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

function hydratePokemon(pokemon, source) {
  if (source.hp !== undefined && source.hp !== null) {
    const hp = Number(source.hp);
    if (!Number.isFinite(hp) || hp < 0 || hp > Number(pokemon.maxhp)) {
      throw new Error(`Mapless persistent HP is outside Showdown bounds for ${pokemon.name}: ${source.hp}`);
    }
    pokemon.hp = hp;
    pokemon.fainted = hp === 0;
  }

  const status = source.status ? String(source.status) : '';
  if (status) {
    if (typeof pokemon.setStatus !== 'function') throw new Error('Showdown Pokémon setStatus surface is required for persistent status hydration');
    const applied = pokemon.setStatus(status);
    if (!applied && pokemon.status !== status) {
      throw new Error(`Showdown rejected persistent status ${status} for ${pokemon.name}`);
    }
  }

  const sourceMoves = new Map((source.moves ?? []).map((move) => [moveId(move.id ?? move.move ?? move), move]));
  for (const slot of pokemon.moveSlots ?? []) {
    const sourceMove = sourceMoves.get(moveId(slot.id ?? slot.move));
    if (!sourceMove || sourceMove.pp === undefined || sourceMove.pp === null) continue;
    const pp = Number(sourceMove.pp);
    const maxpp = Number(slot.maxpp ?? slot.maxPP ?? slot.pp);
    if (!Number.isFinite(pp) || pp < 0 || pp > maxpp) {
      throw new Error(`Mapless persistent PP is outside Showdown bounds for ${pokemon.name}/${slot.id}: ${sourceMove.pp}`);
    }
    slot.pp = pp;
  }
}

function hydrateBattlePersistentState(battle, identity) {
  for (const side of battle.sides ?? []) {
    if (!side) continue;
    let living = 0;
    for (const pokemon of side.pokemon ?? []) {
      const source = identity.tokenToMember.get(String(pokemon.name ?? ''));
      if (!source) throw new Error(`Cannot hydrate unknown Showdown identity token: ${pokemon.name || '<empty>'}`);
      hydratePokemon(pokemon, source);
      if (!pokemon.fainted) living += 1;
    }
    side.pokemonLeft = living;
  }
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

export function createShowdownStreamSession(showdown, config) {
  if (!showdown?.BattleStreams?.BattleStream || !showdown?.BattleStreams?.getPlayerStreams) {
    throw new Error('Executable Showdown BattleStreams surface is required');
  }
  if (typeof showdown?.Teams?.pack !== 'function') throw new Error('Executable Showdown Teams surface is required');
  if (!config?.p1?.team?.length || !config?.p2?.team?.length) throw new Error('Showdown stream session requires p1 and p2 teams');

  const identity = createIdentityTransport(config.p1.team, config.p2.team);
  const battleStream = new showdown.BattleStreams.BattleStream();
  const streams = showdown.BattleStreams.getPlayerStreams(battleStream);
  if (!streams?.omniscient || !streams?.p1 || !streams?.p2) throw new Error('Showdown player streams are incomplete');

  const formatid = String(config.formatid ?? 'gen9customgame');
  const p1Team = showdown.Teams.pack(identity.p1.map(({ member, token }) => normalizeTeamMember(member, token)));
  const p2Team = showdown.Teams.pack(identity.p2.map(({ member, token }) => normalizeTeamMember(member, token)));
  const seed = config.seed;
  const start = { formatid };
  if (seed !== undefined) start.seed = seed;

  let started = false;
  let hydrated = false;
  async function startBattle() {
    if (started) return false;
    started = true;
    await streams.omniscient.write(`>start ${JSON.stringify(start)}`);
    await streams.omniscient.write(playerCommand('p1', config.p1, p1Team));

    const battle = battleStream.battle;
    if (!battle || typeof battle.start !== 'function') throw new Error('Showdown Battle.start surface is required for persistent-state hydration');
    const nativeStart = battle.start.bind(battle);
    battle.start = function maplessHydratedStart(...args) {
      if (!hydrated) {
        hydrateBattlePersistentState(battle, identity);
        hydrated = true;
      }
      return nativeStart(...args);
    };

    await streams.omniscient.write(playerCommand('p2', config.p2, p2Team));
    if (!hydrated) throw new Error('Showdown battle started without Mapless persistent-state hydration');
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
        if (seen.has(resolved.maplessId)) throw new Error(`Showdown resolved side contains duplicate Mapless identity: ${resolved.maplessId}`);
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

  return Object.freeze({ battleStream, streams, start: startBattle, choose, fight, resolvedState });
}

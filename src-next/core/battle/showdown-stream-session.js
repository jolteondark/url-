function assertSide(side) {
  if (side !== 'p1' && side !== 'p2') throw new Error(`Invalid Showdown side: ${side}`);
}

function normalizeTeamMember(member) {
  if (!member?.species) throw new Error('Showdown team member requires species');
  const moves = (member.moves ?? []).map((move) => String(move.id ?? move));
  if (!moves.length) throw new Error('Showdown team member requires at least one move');
  return {
    name: String(member.name ?? member.species),
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

function maplessId(member) {
  return String(member?.maplessId ?? member?.id ?? member?.personalId ?? '');
}

function moveId(move) {
  return String(move?.id ?? move?.move ?? move ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function hydratePersistentMember(battle, pokemon, sourceMember) {
  if (!pokemon || !sourceMember) throw new Error('Showdown persistent hydration requires matching Pokemon');

  if (Number.isFinite(Number(sourceMember.hp))) {
    const hp = Math.trunc(Number(sourceMember.hp));
    pokemon.hp = Math.max(0, Math.min(Number(pokemon.maxhp ?? hp), hp));
    pokemon.fainted = pokemon.hp <= 0;
  }

  const status = sourceMember.status ? String(sourceMember.status).toLowerCase() : '';
  pokemon.status = status;
  pokemon.statusState = typeof battle?.initEffectState === 'function'
    ? battle.initEffectState(status ? { id: status, target: pokemon } : {})
    : { id: status, target: pokemon };

  const sourceMoves = new Map((sourceMember.moves ?? []).map((move) => [moveId(move), move]));
  for (const slot of pokemon.moveSlots ?? []) {
    const sourceMove = sourceMoves.get(moveId(slot));
    if (!sourceMove || !Number.isFinite(Number(sourceMove.pp))) continue;
    slot.pp = Math.max(0, Math.min(Number(slot.maxpp ?? sourceMove.pp), Math.trunc(Number(sourceMove.pp))));
  }
}

function hydratePersistentSide(battle, sideIndex, sourceTeam, identityByPokemon) {
  const pokemon = battle?.sides?.[sideIndex]?.pokemon ?? [];
  if (pokemon.length !== sourceTeam.length) {
    throw new Error('Showdown persistent hydration requires one resolved Pokemon per projected team member');
  }
  const sideIds = new Set();
  pokemon.forEach((member, index) => {
    const sourceMember = sourceTeam[index];
    const id = maplessId(sourceMember);
    if (!id) throw new Error('Showdown persistent hydration requires a stable Mapless Pokemon id');
    if (sideIds.has(id)) throw new Error(`Duplicate Mapless Pokemon id in Showdown projection: ${id}`);
    sideIds.add(id);
    identityByPokemon.set(member, id);
    hydratePersistentMember(battle, member, sourceMember);
  });
}

function resolvedPokemon(pokemon, identityByPokemon) {
  const id = identityByPokemon.get(pokemon);
  if (!id) throw new Error('Resolved Showdown Pokemon has no battle-local Mapless identity');
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

  const battleStream = new showdown.BattleStreams.BattleStream();
  const streams = showdown.BattleStreams.getPlayerStreams(battleStream);
  if (!streams?.omniscient || !streams?.p1 || !streams?.p2) {
    throw new Error('Showdown player streams are incomplete');
  }

  const formatid = String(config.formatid ?? 'gen9customgame');
  const p1Team = showdown.Teams.pack(config.p1.team.map(normalizeTeamMember));
  const p2Team = showdown.Teams.pack(config.p2.team.map(normalizeTeamMember));
  const seed = config.seed;
  const start = { formatid };
  if (seed !== undefined) start.seed = seed;
  const identityByPokemon = new WeakMap();

  let started = false;
  async function startBattle() {
    if (started) return false;
    await streams.omniscient.write(`>start ${JSON.stringify(start)}`);
    await streams.omniscient.write(playerCommand('p1', config.p1, p1Team));
    await streams.omniscient.write(playerCommand('p2', config.p2, p2Team));
    if (!battleStream.battle) throw new Error('Showdown battle state is unavailable after player projection');
    hydratePersistentSide(battleStream.battle, 0, config.p1.team, identityByPokemon);
    hydratePersistentSide(battleStream.battle, 1, config.p2.team, identityByPokemon);
    started = true;
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
      return pokemon.map((member) => resolvedPokemon(member, identityByPokemon));
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

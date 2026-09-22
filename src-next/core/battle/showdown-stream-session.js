function assertSide(side) {
  if (side !== 'p1' && side !== 'p2') throw new Error(`Invalid Showdown side: ${side}`);
}

const PERSISTENT_MAJOR_STATUSES = new Set(['', 'brn', 'frz', 'par', 'psn', 'slp', 'tox']);

function normalizeId(value) { return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function exactLevel(value, boundary) {
  const level = Number(value ?? 1);
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new Error(`${boundary} requires an integer level from 1 to 100`);
  return level;
}
function normalizeTeamMember(member) {
  if (!member?.species) throw new Error('Showdown team member requires species');
  const moves = (member.moves ?? []).map((move) => String(move.id ?? move));
  if (!moves.length) throw new Error('Showdown team member requires at least one move');
  return { name: String(member.name ?? member.species), species: String(member.species), level: exactLevel(member.level, 'Showdown team projection'), item: String(member.heldItem ?? member.item ?? ''), ability: String(member.ability ?? ''), moves };
}
function playerCommand(side, player, packedTeam) { return `>player ${side} ${JSON.stringify({ name: String(player.name ?? side), team: packedTeam })}`; }
function maplessId(member) { return String(member?.maplessId ?? member?.id ?? member?.personalId ?? ''); }
function moveId(move) { return normalizeId(move?.id ?? move?.move ?? move); }
function exactSleepTurns(value, boundary) {
  const turns = Number(value);
  if (!Number.isInteger(turns) || turns < 1) throw new Error(`${boundary} sleep projection requires a positive integer statusTurns`);
  return turns;
}
function exactNonnegativeInteger(value, boundary) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${boundary} requires a non-negative integer`);
  return number;
}
function exactPersistentFainted(value, hp) {
  const expected = hp === 0;
  if (value === undefined) return expected;
  if (typeof value !== 'boolean') throw new Error('Persistent faint projection requires an exact boolean when persisted');
  if (value !== expected) throw new Error(`Persistent faint projection is inconsistent with HP: ${value}/${hp}`);
  return value;
}

function validatePersistentMember(pokemon, sourceMember) {
  if (!pokemon || !sourceMember) throw new Error('Showdown persistent hydration requires matching Pokemon');
  const projectedLevel = exactLevel(sourceMember.level, 'Persistent level projection');
  const showdownLevel = Number(pokemon.level);
  if (!Number.isInteger(showdownLevel) || showdownLevel < 1 || showdownLevel > 100 || projectedLevel !== showdownLevel) throw new Error(`Persistent level projection mismatch: ${projectedLevel}/${Number.isFinite(showdownLevel) ? showdownLevel : '<unknown>'}`);
  const hp = exactNonnegativeInteger(sourceMember.hp, 'Persistent HP projection');
  const maxhp = Number(pokemon.maxhp);
  if (!Number.isFinite(maxhp) || !Number.isInteger(maxhp) || maxhp < 1 || hp > maxhp) throw new Error(`Persistent HP projection is outside Showdown bounds: ${hp}/${Number.isFinite(maxhp) ? maxhp : '<unknown>'}`);
  if (sourceMember.maxhp !== undefined || sourceMember.maxHp !== undefined) {
    const persistentMaxhp = exactNonnegativeInteger(sourceMember.maxhp ?? sourceMember.maxHp, 'Persistent max HP projection');
    if (persistentMaxhp < 1 || persistentMaxhp !== maxhp) throw new Error(`Persistent max HP projection mismatch: ${persistentMaxhp}/${maxhp}`);
  }
  exactPersistentFainted(sourceMember.fainted, hp);

  const status = sourceMember.status ? String(sourceMember.status).toLowerCase() : '';
  if (!PERSISTENT_MAJOR_STATUSES.has(status)) throw new Error(`Persistent status projection requires a canonical Showdown major status: ${status || '<empty>'}`);
  if (status === 'slp') exactSleepTurns(sourceMember.statusTurns, 'Persistent');

  const projectedItem = normalizeId(sourceMember.heldItem ?? sourceMember.item ?? '');
  const showdownItem = normalizeId(pokemon.item);
  if (showdownItem !== projectedItem) throw new Error(`Persistent held-item projection mismatch: ${projectedItem || '<empty>'}/${showdownItem || '<empty>'}`);

  const sourceMoves = sourceMember.moves ?? [];
  const sourceById = new Map();
  for (const move of sourceMoves) {
    const id = moveId(move);
    if (!id) throw new Error('Persistent PP projection requires a stable move id');
    if (sourceById.has(id)) throw new Error(`Duplicate Mapless move id in Showdown projection: ${id}`);
    exactNonnegativeInteger(move?.pp, `Persistent PP projection for ${id}`);
    sourceById.set(id, move);
  }
  const slots = pokemon.moveSlots ?? [];
  if (slots.length !== sourceMoves.length) throw new Error('Persistent PP projection requires one Showdown move slot per Mapless move');
  const hydratedIds = new Set();
  for (const slot of slots) {
    const id = moveId(slot);
    const sourceMove = sourceById.get(id);
    if (!sourceMove) throw new Error(`Persistent PP projection could not match Showdown move slot: ${id || '<unknown>'}`);
    if (hydratedIds.has(id)) throw new Error(`Duplicate Showdown move slot during PP projection: ${id}`);
    hydratedIds.add(id);
    const pp = exactNonnegativeInteger(sourceMove.pp, `Persistent PP projection for ${id}`);
    const maxpp = Number(slot.maxpp);
    if (!Number.isFinite(maxpp) || pp > maxpp) throw new Error(`Persistent PP projection is outside Showdown bounds for ${id}: ${pp}/${Number.isFinite(maxpp) ? maxpp : '<unknown>'}`);
    if (sourceMove.maxpp !== undefined || sourceMove.maxPP !== undefined) {
      const persistentMaxpp = exactNonnegativeInteger(sourceMove.maxpp ?? sourceMove.maxPP, `Persistent max PP projection for ${id}`);
      if (persistentMaxpp !== maxpp) throw new Error(`Persistent max PP projection mismatch for ${id}: ${persistentMaxpp}/${maxpp}`);
    }
  }
}

function validatePersistentSide(battle, sideIndex, sourceTeam) {
  const pokemon = battle?.sides?.[sideIndex]?.pokemon ?? [];
  if (pokemon.length !== sourceTeam.length) throw new Error('Showdown persistent hydration requires one resolved Pokemon per projected team member');
  const sideIds = new Set();
  pokemon.forEach((member, index) => {
    const sourceMember = sourceTeam[index];
    const id = maplessId(sourceMember);
    if (!id) throw new Error('Showdown persistent hydration requires a stable Mapless Pokemon id');
    if (sideIds.has(id)) throw new Error(`Duplicate Mapless Pokemon id in Showdown projection: ${id}`);
    sideIds.add(id);
    validatePersistentMember(member, sourceMember);
  });
}

function hydratePersistentStatus(battle, pokemon, sourceMember) {
  const status = sourceMember.status ? String(sourceMember.status).toLowerCase() : '';
  pokemon.status = status;
  pokemon.statusState = typeof battle?.initEffectState === 'function' ? battle.initEffectState(status ? { id: status, target: pokemon } : {}) : { id: status, ...(status ? { target: pokemon } : {}) };
  if (status === 'tox') pokemon.statusState.stage = 0;
  if (status === 'slp') {
    const turns = exactSleepTurns(sourceMember.statusTurns, 'Persistent');
    pokemon.statusState.startTime = turns;
    pokemon.statusState.time = turns;
  }
}

function hydratePersistentMember(battle, pokemon, sourceMember) {
  const hp = exactNonnegativeInteger(sourceMember.hp, 'Persistent HP projection');
  pokemon.hp = hp;
  pokemon.fainted = exactPersistentFainted(sourceMember.fainted, hp);
  hydratePersistentStatus(battle, pokemon, sourceMember);
  pokemon.item = normalizeId(sourceMember.heldItem ?? sourceMember.item ?? '');
  const sourceById = new Map((sourceMember.moves ?? []).map((move) => [moveId(move), move]));
  for (const slot of pokemon.moveSlots ?? []) slot.pp = exactNonnegativeInteger(sourceById.get(moveId(slot)).pp, `Persistent PP projection for ${moveId(slot)}`);
}

function hydratePersistentSide(battle, sideIndex, sourceTeam, identityByPokemon) {
  const pokemon = battle.sides[sideIndex].pokemon;
  pokemon.forEach((member, index) => {
    const sourceMember = sourceTeam[index];
    identityByPokemon.set(member, maplessId(sourceMember));
    hydratePersistentMember(battle, member, sourceMember);
  });
}

function resolvedPokemon(pokemon, identityByPokemon) {
  const id = identityByPokemon.get(pokemon);
  if (!id) throw new Error('Resolved Showdown Pokemon has no battle-local Mapless identity');
  const moveSlots = pokemon?.moveSlots ?? [];
  const status = pokemon?.status ? String(pokemon.status) : '';
  const resolved = { maplessId: id, hp: Number(pokemon?.hp ?? 0), maxhp: Number(pokemon?.maxhp ?? pokemon?.maxHp ?? 0), status, heldItem: pokemon?.item ? String(pokemon.item) : '', fainted: Boolean(pokemon?.fainted), moves: moveSlots.map((move) => Object.freeze({ id: String(move.id ?? move.move ?? ''), pp: Number(move.pp ?? 0), maxpp: Number(move.maxpp ?? move.maxPP ?? move.pp ?? 0) })) };
  if (status.toLowerCase() === 'slp') resolved.statusTurns = exactSleepTurns(pokemon?.statusState?.time, 'Resolved Showdown');
  return Object.freeze(resolved);
}

export function createShowdownStreamSession(showdown, config) {
  if (!showdown?.BattleStreams?.BattleStream || !showdown?.BattleStreams?.getPlayerStreams) throw new Error('Executable Showdown BattleStreams surface is required');
  if (typeof showdown?.Teams?.pack !== 'function') throw new Error('Executable Showdown Teams surface is required');
  if (!config?.p1?.team?.length || !config?.p2?.team?.length) throw new Error('Showdown stream session requires p1 and p2 teams');

  const battleStream = new showdown.BattleStreams.BattleStream();
  const streams = showdown.BattleStreams.getPlayerStreams(battleStream);
  if (!streams?.omniscient || !streams?.p1 || !streams?.p2) throw new Error('Showdown player streams are incomplete');
  const formatid = String(config.formatid ?? 'gen9customgame');
  const p1Team = showdown.Teams.pack(config.p1.team.map(normalizeTeamMember));
  const p2Team = showdown.Teams.pack(config.p2.team.map(normalizeTeamMember));
  const start = { formatid };
  if (config.seed !== undefined) start.seed = config.seed;
  const identityByPokemon = new WeakMap();

  let startAttempted = false;
  let started = false;
  async function startBattle() {
    if (started) return false;
    if (startAttempted) throw new Error('Showdown battle start previously failed; partial projection cannot be replayed');
    startAttempted = true;
    await streams.omniscient.write(`>start ${JSON.stringify(start)}`);
    await streams.omniscient.write(playerCommand('p1', config.p1, p1Team));
    await streams.omniscient.write(playerCommand('p2', config.p2, p2Team));
    const battle = battleStream.battle;
    if (!battle) throw new Error('Showdown battle state is unavailable after player projection');

    // Preflight both sides before mutating either Showdown side. Starting projection is atomic.
    validatePersistentSide(battle, 0, config.p1.team);
    validatePersistentSide(battle, 1, config.p2.team);
    hydratePersistentSide(battle, 0, config.p1.team, identityByPokemon);
    hydratePersistentSide(battle, 1, config.p2.team, identityByPokemon);

    if (typeof battle.makeRequest !== 'function') throw new Error('Showdown battle makeRequest surface is required after persistent hydration');
    battle.makeRequest();
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
    const projectSide = (sideIndex) => (sides[sideIndex]?.pokemon ?? []).map((member) => resolvedPokemon(member, identityByPokemon));
    return Object.freeze({ terminal: Boolean(battleStream.battle.ended), winner: battleStream.battle.winner ? String(battleStream.battle.winner) : '', turn: Number(battleStream.battle.turn ?? 0), p1: projectSide(0), p2: projectSide(1) });
  }
  return Object.freeze({ battleStream, streams, start: startBattle, choose, fight, resolvedState });
}

const MAIN_STATS = ["HP", "ATTACK", "DEFENSE", "SPECIAL_ATTACK", "SPECIAL_DEFENSE", "SPEED"];
const IV_STAT_LIMIT = 31;
const MAPLESS_BONUS_STAT_ALIASES = {
  HP: "HP",
  ATTACK: "ATTACK", ATK: "ATTACK",
  DEFENSE: "DEFENSE", DEF: "DEFENSE",
  SPECIAL_ATTACK: "SPECIAL_ATTACK", SPECIALATTACK: "SPECIAL_ATTACK", SPATK: "SPECIAL_ATTACK", SP_ATK: "SPECIAL_ATTACK",
  SPECIAL_DEFENSE: "SPECIAL_DEFENSE", SPECIALDEFENSE: "SPECIAL_DEFENSE", SPDEF: "SPECIAL_DEFENSE", SP_DEF: "SPECIAL_DEFENSE",
  SPEED: "SPEED", SPE: "SPEED",
};

function normalizePokemonMoveEntry(move) {
  if (typeof move === "string" && move.length > 0) return move;
  if (!move || typeof move !== "object" || Array.isArray(move)) {
    throw new TypeError("move entries must be non-empty ids or move objects");
  }
  if (typeof move.id !== "string" || move.id.length === 0) {
    throw new TypeError("move object id must be a non-empty string");
  }
  return { ...move };
}

function clonePokemonMoves(moves) {
  return moves.map((move) => (typeof move === "string" ? move : { ...move }));
}

function parseInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new TypeError(`${field} must be an integer`);
  return parsed;
}

function parseNonNegativeInteger(value, field) {
  const parsed = parseInteger(value, field);
  if (parsed < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return parsed;
}

function normalizeCounterId(value, field) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${field} must be a non-empty id`);
  return value;
}

function normalizeEvolutionCounterMap(value, field) {
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  const ret = {};
  for (const [id, count] of Object.entries(value)) {
    normalizeCounterId(id, `${field} key`);
    ret[id] = parseInteger(count, `${field}.${id}`);
  }
  return ret;
}

function normalizeStatMap(value, field, { boolean = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be a stat object`);
  const normalized = {};
  for (const stat of MAIN_STATS) {
    if (!Object.prototype.hasOwnProperty.call(value, stat)) throw new TypeError(`${field}.${stat} is required`);
    if (boolean) {
      if (typeof value[stat] !== "boolean") throw new TypeError(`${field}.${stat} must be boolean`);
      normalized[stat] = value[stat];
    } else {
      normalized[stat] = parseNonNegativeInteger(value[stat], `${field}.${stat}`);
    }
  }
  return normalized;
}

function normalizeCalculatedStats(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("stats must be an object");
  const normalized = {};
  for (const stat of MAIN_STATS.slice(1)) {
    if (!Object.prototype.hasOwnProperty.call(value, stat)) throw new TypeError(`stats.${stat} is required`);
    normalized[stat] = parseNonNegativeInteger(value[stat], `stats.${stat}`);
  }
  return normalized;
}

function normalizeNatureStatChanges(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new TypeError("nature_stat_changes must be an array");
  return value.map((entry, index) => {
    if (!Array.isArray(entry) || entry.length !== 2 || !MAIN_STATS.includes(entry[0])) {
      throw new TypeError(`nature_stat_changes[${index}] must be [stat, integer]`);
    }
    const amount = Number(entry[1]);
    if (!Number.isInteger(amount)) throw new TypeError(`nature_stat_changes[${index}][1] must be an integer`);
    return [entry[0], amount];
  });
}

function normalizeStringOrNull(value, field) {
  if (value == null) return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string or null`);
  return value;
}

function normalizeIdList(value, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.length === 0) throw new TypeError(`${field}[${index}] must be a non-empty id`);
    return entry;
  });
}

function normalizeOpaqueList(value, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return value.map((entry) => (entry && typeof entry === "object" ? structuredClone(entry) : entry));
}

function normalizeOwner(value) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("owner must be an object or null");
  for (const key of ["id", "name", "gender", "language"]) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new TypeError(`owner.${key} is required`);
  }
  return { id: value.id, name: value.name, gender: value.gender, language: value.language };
}

function normalizePokemonMail(value) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("mail must be a Mail object or null");
  for (const key of ["item", "message", "sender"]) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new TypeError(`mail.${key} is required`);
  }
  if (typeof value.item !== "string" || value.item.length === 0) throw new TypeError("mail.item must be a non-empty item id");
  const normalized = {
    item: value.item,
    message: value.message && typeof value.message === "object" ? structuredClone(value.message) : value.message,
    sender: value.sender && typeof value.sender === "object" ? structuredClone(value.sender) : value.sender,
  };
  for (const key of ["poke1", "poke2", "poke3"]) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (value[key] == null) {
      normalized[key] = null;
    } else {
      if (!Array.isArray(value[key])) throw new TypeError(`mail.${key} must be an array or null`);
      normalized[key] = structuredClone(value[key]);
    }
  }
  return normalized;
}

function maplessBonusZeroStats() {
  return Object.fromEntries(MAIN_STATS.map((stat) => [stat, 0]));
}

function normalizeMaplessBonusStatKey(value) {
  const token = String(value).toUpperCase().replace(/[^A-Z_]/g, "");
  return MAPLESS_BONUS_STAT_ALIASES[token] ?? null;
}

function normalizeMaplessBonusStatValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(Math.trunc(value), 0);
}

export function normalizePokemonMaplessBonusStats(value) {
  const normalized = maplessBonusZeroStats();
  if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = normalizeMaplessBonusStatKey(rawKey);
    if (key) normalized[key] = normalizeMaplessBonusStatValue(rawValue);
  }
  return normalized;
}

function copyPersistentMetadata(runtime, input) {
  if (Object.prototype.hasOwnProperty.call(input, "owner")) runtime.owner = normalizeOwner(input.owner);
  if (Object.prototype.hasOwnProperty.call(input, "nickname")) runtime.nickname = normalizeStringOrNull(input.nickname, "nickname");
  if (Object.prototype.hasOwnProperty.call(input, "happiness")) {
    runtime.happiness = input.happiness == null ? null : parseNonNegativeInteger(input.happiness, "happiness");
  }
  for (const field of ["cool", "beauty", "cute", "smart", "tough", "sheen", "pokerus"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) runtime[field] = parseNonNegativeInteger(input[field], field);
  }
  for (const field of ["forced_form", "time_form_set", "ability_index"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      runtime[field] = input[field] == null ? null : parseNonNegativeInteger(input[field], field);
    }
  }
  for (const field of ["shiny", "super_shiny", "ready_to_evolve", "cannot_store", "cannot_release", "cannot_trade", "mapless_overworld_confusion", "mapless_egg_shop_bonus_pending", "mapless_hatch_pending"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      if (input[field] != null && typeof input[field] !== "boolean") throw new TypeError(`${field} must be boolean or null`);
      runtime[field] = input[field];
    }
  }
  for (const field of ["mapless_egg_shop_day", "mapless_hatch_level"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      if (input[field] == null) {
        runtime[field] = null;
      } else {
        const value = parseNonNegativeInteger(input[field], field);
        if (value < 1) throw new TypeError(`${field} must be a positive integer or null`);
        runtime[field] = value;
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, "mapless_hatch_system_version")) {
    runtime.mapless_hatch_system_version = input.mapless_hatch_system_version == null
      ? null
      : parseNonNegativeInteger(input.mapless_hatch_system_version, "mapless_hatch_system_version");
  }
  if (Object.prototype.hasOwnProperty.call(input, "mapless_egg_shop_bonus_move")) {
    runtime.mapless_egg_shop_bonus_move = input.mapless_egg_shop_bonus_move == null
      ? null
      : normalizeCounterId(input.mapless_egg_shop_bonus_move, "mapless_egg_shop_bonus_move");
  }
  if (runtime.super_shiny === true) runtime.shiny = true;
  if (Object.prototype.hasOwnProperty.call(input, "fused")) {
    if (input.fused == null) {
      runtime.fused = null;
    } else {
      if (!input.fused || typeof input.fused !== "object" || Array.isArray(input.fused)) throw new TypeError("fused must be a Pokemon runtime or null");
      if (input.fused === input) throw new TypeError("fused Pokemon cannot reference itself");
      if (Object.prototype.hasOwnProperty.call(input.fused, "fused") && input.fused.fused != null) {
        throw new TypeError("nested fused Pokemon is not a canonical fusion state");
      }
      runtime.fused = createPokemonRuntime(input.fused);
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, "mail")) {
    const mail = normalizePokemonMail(input.mail);
    runtime.mail = mail && runtime.item === mail.item ? mail : null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "poke_ball")) {
    if (typeof input.poke_ball !== "string" || input.poke_ball.length === 0) throw new TypeError("poke_ball must be a non-empty id");
    runtime.poke_ball = input.poke_ball;
  }
  if (Object.prototype.hasOwnProperty.call(input, "markings")) runtime.markings = normalizeOpaqueList(input.markings, "markings");
  if (Object.prototype.hasOwnProperty.call(input, "steps_to_hatch")) runtime.steps_to_hatch = parseNonNegativeInteger(input.steps_to_hatch, "steps_to_hatch");
  if (Object.prototype.hasOwnProperty.call(input, "mapless_bonus_stats")) {
    runtime.mapless_bonus_stats = (runtime.steps_to_hatch ?? 0) > 0 ? maplessBonusZeroStats() : normalizePokemonMaplessBonusStats(input.mapless_bonus_stats);
  }
  if (Object.prototype.hasOwnProperty.call(input, "first_moves")) runtime.first_moves = normalizeIdList(input.first_moves, "first_moves");
  if (Object.prototype.hasOwnProperty.call(input, "ribbons")) runtime.ribbons = normalizeIdList(input.ribbons, "ribbons");
  if (Object.prototype.hasOwnProperty.call(input, "obtain_method")) runtime.obtain_method = parseNonNegativeInteger(input.obtain_method, "obtain_method");
  if (Object.prototype.hasOwnProperty.call(input, "obtain_map")) runtime.obtain_map = parseNonNegativeInteger(input.obtain_map, "obtain_map");
  if (Object.prototype.hasOwnProperty.call(input, "obtain_text")) runtime.obtain_text = normalizeStringOrNull(input.obtain_text, "obtain_text");
  if (Object.prototype.hasOwnProperty.call(input, "obtain_level")) {
    const obtainLevel = Number(input.obtain_level);
    if (!Number.isInteger(obtainLevel) || obtainLevel < 1) throw new TypeError("obtain_level must be a positive integer");
    runtime.obtain_level = obtainLevel;
  }
  if (Object.prototype.hasOwnProperty.call(input, "hatched_map")) runtime.hatched_map = parseNonNegativeInteger(input.hatched_map, "hatched_map");
  if (Object.prototype.hasOwnProperty.call(input, "time_received")) {
    runtime.time_received = input.time_received == null ? null : parseNonNegativeInteger(input.time_received, "time_received");
  }
  if (Object.prototype.hasOwnProperty.call(input, "time_egg_hatched")) {
    runtime.time_egg_hatched = input.time_egg_hatched == null ? null : parseNonNegativeInteger(input.time_egg_hatched, "time_egg_hatched");
  }
  return runtime;
}

export function pokemonMoveTotalPp(baseTotalPp, ppup = 0) {
  const base = parseNonNegativeInteger(baseTotalPp, "base_total_pp");
  const bonus = parseNonNegativeInteger(ppup, "ppup");
  return Math.floor((base * (5 + bonus)) / 5);
}

export function materializePokemonMoveRuntime(move, baseTotalPp) {
  const normalized = normalizePokemonMoveEntry(move);
  const value = typeof normalized === "string" ? { id: normalized } : { ...normalized };
  const ppup = value.ppup == null ? 0 : parseNonNegativeInteger(value.ppup, "ppup");
  const totalPp = pokemonMoveTotalPp(baseTotalPp, ppup);
  const pp = value.pp == null ? totalPp : parseNonNegativeInteger(value.pp, "pp");
  return { ...value, ppup, pp: Math.min(pp, totalPp) };
}

export function createPokemonRuntime(input) {
  if (!input || typeof input !== "object") throw new TypeError("pokemon input is required");
  if (typeof input.species !== "string" || input.species.length === 0) throw new TypeError("species reference is required");
  const level = Number.parseInt(input.level, 10);
  if (!Number.isInteger(level) || level < 1) throw new TypeError("level must be a positive integer");
  const personalId = input.personal_id == null ? null : Number.parseInt(input.personal_id, 10);
  const gender = input.gender == null ? null : Number.parseInt(input.gender, 10);
  const form = Number.parseInt(input.form ?? 0, 10);
  if (personalId !== null && !Number.isInteger(personalId)) throw new TypeError("personal_id must be an integer or null");
  if (gender !== null && ![0, 1, 2].includes(gender)) throw new TypeError("gender must be 0, 1, 2, or null");
  if (!Number.isInteger(form) || form < 0) throw new TypeError("form must be a non-negative integer");
  const moves = (input.moves == null ? [] : [...input.moves]).map(normalizePokemonMoveEntry);
  const exp = input.exp == null ? null : Number.parseInt(input.exp, 10);
  const hp = input.hp == null ? null : Number.parseInt(input.hp, 10);
  const condition = input.status == null ? null : input.status;
  const conditionCount = Number.parseInt(input.status_count ?? 0, 10);
  const heldItem = input.item == null ? null : input.item;
  const abilityId = input.ability_id == null ? null : input.ability_id;
  const natureId = input.nature_id == null ? null : input.nature_id;
  const natureForStatsId = input.nature_for_stats_id == null ? null : input.nature_for_stats_id;
  if (exp !== null && (!Number.isInteger(exp) || exp < 0)) throw new TypeError("exp must be a non-negative integer or null");
  if (hp !== null && (!Number.isInteger(hp) || hp < 0)) throw new TypeError("hp must be a non-negative integer or null");
  if (condition !== null && (typeof condition !== "string" || condition.length === 0)) throw new TypeError("status reference must be a non-empty string or null");
  if (!Number.isInteger(conditionCount) || conditionCount < 0) throw new TypeError("status_count must be a non-negative integer");
  if (heldItem !== null && (typeof heldItem !== "string" || heldItem.length === 0)) throw new TypeError("item reference must be a non-empty string or null");
  if (abilityId !== null && (typeof abilityId !== "string" || abilityId.length === 0)) throw new TypeError("ability_id reference must be a non-empty string or null");
  if (natureId !== null && (typeof natureId !== "string" || natureId.length === 0)) throw new TypeError("nature_id reference must be a non-empty string or null");
  if (natureForStatsId !== null && (typeof natureForStatsId !== "string" || natureForStatsId.length === 0)) throw new TypeError("nature_for_stats_id reference must be a non-empty string or null");
  const runtime = {
    species: input.species,
    level,
    personal_id: personalId,
    gender,
    form,
    moves,
    exp,
    hp,
    status: condition,
    status_count: conditionCount,
    item: heldItem,
    ability_id: abilityId,
    nature_id: natureId,
    evo_move_count: normalizeEvolutionCounterMap(input.evo_move_count ?? {}, "evo_move_count"),
    evo_crest_count: normalizeEvolutionCounterMap(input.evo_crest_count ?? {}, "evo_crest_count"),
    evo_recoil_count: input.evo_recoil_count == null ? 0 : parseInteger(input.evo_recoil_count, "evo_recoil_count"),
    evo_step_count: input.evo_step_count == null ? 0 : parseInteger(input.evo_step_count, "evo_step_count"),
  };
  if (input.nature_for_stats_id !== undefined) runtime.nature_for_stats_id = natureForStatsId;
  if (input.iv !== undefined) runtime.iv = normalizeStatMap(input.iv, "iv");
  if (input.iv_maxed !== undefined) runtime.iv_maxed = normalizeStatMap(input.iv_maxed, "iv_maxed", { boolean: true });
  if (input.ev !== undefined) runtime.ev = normalizeStatMap(input.ev, "ev");
  if (input.max_hp !== undefined) runtime.max_hp = parseNonNegativeInteger(input.max_hp, "max_hp");
  if (input.stats !== undefined) runtime.stats = normalizeCalculatedStats(input.stats);
  return copyPersistentMetadata(runtime, input);
}

export function resolvePokemonAbilityIndex(runtime) {
  const current = createPokemonRuntime(runtime);
  if (current.ability_index != null) return current.ability_index;
  if (current.personal_id == null) throw new TypeError("personal_id is required to resolve ability_index");
  return current.personal_id & 1;
}

export function updatePokemonRuntime(runtime, patch) {
  const current = createPokemonRuntime(runtime);
  if (!patch || typeof patch !== "object") throw new TypeError("pokemon patch is required");
  const next = { ...current, ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "ability_index") && !Object.prototype.hasOwnProperty.call(patch, "ability_id")) {
    next.ability_id = null;
  }
  if (patch.super_shiny === true) next.shiny = true;
  return createPokemonRuntime(next);
}

export function isPokemonRuntimeMaplessHatchPending(runtime) {
  const current = createPokemonRuntime(runtime);
  return current.mapless_hatch_pending === true;
}

export function markPokemonRuntimeMaplessHatchPending(runtime) {
  const current = createPokemonRuntime(runtime);
  const stepsToHatch = (current.steps_to_hatch ?? 0) <= 0 ? 1 : current.steps_to_hatch;
  return createPokemonRuntime({ ...current, steps_to_hatch: stepsToHatch, mapless_hatch_pending: true });
}

export function clearPokemonRuntimeMaplessHatchPending(runtime) {
  const current = createPokemonRuntime(runtime);
  return createPokemonRuntime({ ...current, mapless_hatch_pending: false });
}

export function pokemonRuntimeEvolutionMoveCount(runtime, move) {
  const current = createPokemonRuntime(runtime);
  const id = normalizeCounterId(move, "move");
  return current.evo_move_count[id] ?? 0;
}

export function setPokemonRuntimeEvolutionMoveCount(runtime, move, value) {
  const current = createPokemonRuntime(runtime);
  const id = normalizeCounterId(move, "move");
  const counters = { ...current.evo_move_count, [id]: parseInteger(value, "evo_move_count value") };
  return createPokemonRuntime({ ...current, evo_move_count: counters });
}

export function addPokemonRuntimeEvolutionMoveCount(runtime, move, qty = 1) {
  const current = createPokemonRuntime(runtime);
  const id = normalizeCounterId(move, "move");
  return setPokemonRuntimeEvolutionMoveCount(current, id, (current.evo_move_count[id] ?? 0) + parseInteger(qty, "qty"));
}

export function pokemonRuntimeEvolutionCrestCount(runtime, item) {
  const current = createPokemonRuntime(runtime);
  const id = normalizeCounterId(item, "item");
  return current.evo_crest_count[id] ?? 0;
}

export function setPokemonRuntimeEvolutionCrestCount(runtime, item, value) {
  const current = createPokemonRuntime(runtime);
  const id = normalizeCounterId(item, "item");
  const counters = { ...current.evo_crest_count, [id]: parseInteger(value, "evo_crest_count value") };
  return createPokemonRuntime({ ...current, evo_crest_count: counters });
}

export function addPokemonRuntimeEvolutionCrestCount(runtime, item, qty = 1) {
  const current = createPokemonRuntime(runtime);
  const id = normalizeCounterId(item, "item");
  return setPokemonRuntimeEvolutionCrestCount(current, id, (current.evo_crest_count[id] ?? 0) + parseInteger(qty, "qty"));
}

export function setPokemonRuntimeEvolutionRecoilCount(runtime, value) {
  const current = createPokemonRuntime(runtime);
  return createPokemonRuntime({ ...current, evo_recoil_count: parseInteger(value, "evo_recoil_count") });
}

export function addPokemonRuntimeEvolutionRecoilCount(runtime, qty = 1) {
  const current = createPokemonRuntime(runtime);
  return setPokemonRuntimeEvolutionRecoilCount(current, current.evo_recoil_count + parseInteger(qty, "qty"));
}

export function setPokemonRuntimeEvolutionStepCount(runtime, value) {
  const current = createPokemonRuntime(runtime);
  return createPokemonRuntime({ ...current, evo_step_count: parseInteger(value, "evo_step_count") });
}

export function addPokemonRuntimeEvolutionStepCount(runtime, qty = 1) {
  const current = createPokemonRuntime(runtime);
  return setPokemonRuntimeEvolutionStepCount(current, current.evo_step_count + parseInteger(qty, "qty"));
}

export function setPokemonRuntimeMovePp(runtime, index, pp, baseTotalPp) {
  const current = createPokemonRuntime(runtime);
  if (!Number.isInteger(index) || index < 0 || index >= current.moves.length) throw new RangeError("move index out of range");
  const moves = clonePokemonMoves(current.moves);
  const move = materializePokemonMoveRuntime(moves[index], baseTotalPp);
  const totalPp = pokemonMoveTotalPp(baseTotalPp, move.ppup);
  move.pp = Math.min(parseNonNegativeInteger(pp, "pp"), totalPp);
  moves[index] = move;
  return createPokemonRuntime({ ...current, moves });
}

export function calculatePokemonHp(base, level, iv, ev, { disableIvsAndEvs = false } = {}) {
  const baseValue = parseNonNegativeInteger(base, "base");
  const levelValue = parseNonNegativeInteger(level, "level");
  let ivValue = parseNonNegativeInteger(iv, "iv");
  let evValue = parseNonNegativeInteger(ev, "ev");
  if (baseValue === 1) return 1;
  if (disableIvsAndEvs) ivValue = evValue = 0;
  return Math.floor(((baseValue * 2 + ivValue + Math.floor(evValue / 4)) * levelValue) / 100) + levelValue + 10;
}

export function calculatePokemonStat(base, level, iv, ev, natureModifier = 100, { disableIvsAndEvs = false } = {}) {
  const baseValue = parseNonNegativeInteger(base, "base");
  const levelValue = parseNonNegativeInteger(level, "level");
  let ivValue = parseNonNegativeInteger(iv, "iv");
  let evValue = parseNonNegativeInteger(ev, "ev");
  const natureValue = parseNonNegativeInteger(natureModifier, "nature_modifier");
  if (disableIvsAndEvs) ivValue = evValue = 0;
  const raw = Math.floor(((baseValue * 2 + ivValue + Math.floor(evValue / 4)) * levelValue) / 100) + 5;
  return Math.floor((raw * natureValue) / 100);
}

export function recalculatePokemonStats(runtime, { base_stats, nature_stat_changes = [], disable_ivs_and_evs = false, previous_mapless_bonus_stats = null } = {}) {
  const current = createPokemonRuntime(runtime);
  const baseStats = normalizeStatMap(base_stats, "base_stats");
  const iv = normalizeStatMap(current.iv, "iv");
  const ev = normalizeStatMap(current.ev, "ev");
  const ivMaxed = current.iv_maxed == null
    ? Object.fromEntries(MAIN_STATS.map((stat) => [stat, false]))
    : normalizeStatMap(current.iv_maxed, "iv_maxed", { boolean: true });
  const natureMod = Object.fromEntries(MAIN_STATS.map((stat) => [stat, 100]));
  for (const [stat, amount] of normalizeNatureStatChanges(nature_stat_changes)) natureMod[stat] += amount;
  const effectiveIv = Object.fromEntries(MAIN_STATS.map((stat) => [stat, ivMaxed[stat] ? IV_STAT_LIMIT : iv[stat]]));
  const bonuses = (current.steps_to_hatch ?? 0) > 0 ? maplessBonusZeroStats() : normalizePokemonMaplessBonusStats(current.mapless_bonus_stats);
  const previousBonuses = (current.steps_to_hatch ?? 0) > 0
    ? maplessBonusZeroStats()
    : normalizePokemonMaplessBonusStats(previous_mapless_bonus_stats ?? bonuses);
  const baseCalculated = {
    HP: calculatePokemonHp(baseStats.HP, current.level, effectiveIv.HP, ev.HP, { disableIvsAndEvs: disable_ivs_and_evs }),
  };
  for (const stat of MAIN_STATS.slice(1)) {
    baseCalculated[stat] = calculatePokemonStat(baseStats[stat], current.level, effectiveIv[stat], ev[stat], natureMod[stat], { disableIvsAndEvs: disable_ivs_and_evs });
  }
  const oldMaxHp = current.max_hp == null ? 1 : Math.max(current.max_hp - previousBonuses.HP, 1);
  const oldHp = current.hp == null ? 1 : current.hp;
  const hpDifference = baseCalculated.HP - oldMaxHp;
  let hp = oldHp;
  if (oldHp > 0 || hpDifference > 0) hp = Math.min(Math.max(oldHp + hpDifference, 1), baseCalculated.HP);
  const calculated = Object.fromEntries(MAIN_STATS.map((stat) => [stat, baseCalculated[stat] + bonuses[stat]]));
  hp = Math.min(Math.max(hp, 0), calculated.HP);
  return createPokemonRuntime({
    ...current,
    hp,
    max_hp: calculated.HP,
    stats: Object.fromEntries(MAIN_STATS.slice(1).map((stat) => [stat, calculated[stat]])),
    iv,
    iv_maxed: ivMaxed,
    ev,
    mapless_bonus_stats: bonuses,
  });
}

export function setPokemonRuntimeMaplessBonusStat(runtime, stat, value, calcInput = {}) {
  const current = createPokemonRuntime(runtime);
  const key = normalizeMaplessBonusStatKey(stat);
  if (!key || (current.steps_to_hatch ?? 0) > 0) return current;
  const previous = normalizePokemonMaplessBonusStats(current.mapless_bonus_stats);
  const normalized = normalizeMaplessBonusStatValue(value);
  const nextBonuses = { ...previous, [key]: normalized };
  let next = recalculatePokemonStats(
    createPokemonRuntime({ ...current, mapless_bonus_stats: nextBonuses }),
    { ...calcInput, previous_mapless_bonus_stats: previous },
  );
  if (key === "HP" && (current.hp ?? 0) > 0 && normalized > previous.HP) {
    next = createPokemonRuntime({ ...next, hp: Math.min((current.hp ?? 0) + (normalized - previous.HP), next.max_hp) });
  }
  return next;
}

export function addPokemonRuntimeMaplessBonusStat(runtime, stat, amount, calcInput = {}) {
  const current = createPokemonRuntime(runtime);
  const key = normalizeMaplessBonusStatKey(stat);
  if (!key || (current.steps_to_hatch ?? 0) > 0) return current;
  const bonuses = normalizePokemonMaplessBonusStats(current.mapless_bonus_stats);
  const delta = typeof amount === "number" && Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return setPokemonRuntimeMaplessBonusStat(current, key, Math.max(bonuses[key] + delta, 0), calcInput);
}

export function addPokemonRuntimeAllMaplessBonusStats(runtime, amount, calcInput = {}) {
  const current = createPokemonRuntime(runtime);
  if ((current.steps_to_hatch ?? 0) > 0) return current;
  const previous = normalizePokemonMaplessBonusStats(current.mapless_bonus_stats);
  const delta = typeof amount === "number" && Number.isFinite(amount) ? Math.trunc(amount) : 0;
  const nextBonuses = Object.fromEntries(MAIN_STATS.map((stat) => [stat, Math.max(previous[stat] + delta, 0)]));
  let next = recalculatePokemonStats(
    createPokemonRuntime({ ...current, mapless_bonus_stats: nextBonuses }),
    { ...calcInput, previous_mapless_bonus_stats: previous },
  );
  const hpIncrease = nextBonuses.HP - previous.HP;
  if ((current.hp ?? 0) > 0 && hpIncrease > 0) {
    next = createPokemonRuntime({ ...next, hp: Math.min((current.hp ?? 0) + hpIncrease, next.max_hp) });
  }
  return next;
}

export function resetPokemonRuntimeMaplessBonusStats(runtime, calcInput = {}) {
  const current = createPokemonRuntime(runtime);
  const previous = normalizePokemonMaplessBonusStats(current.mapless_bonus_stats);
  let next = recalculatePokemonStats(
    createPokemonRuntime({ ...current, mapless_bonus_stats: maplessBonusZeroStats() }),
    { ...calcInput, previous_mapless_bonus_stats: previous },
  );
  if ((current.hp ?? 0) > 0) next = createPokemonRuntime({ ...next, hp: Math.min(current.hp, next.max_hp) });
  return next;
}

export function snapshotPokemonRuntime(runtime) {
  const value = createPokemonRuntime(runtime);
  return {
    ...value,
    moves: clonePokemonMoves(value.moves),
    evo_move_count: { ...value.evo_move_count },
    evo_crest_count: { ...value.evo_crest_count },
    ...(value.iv ? { iv: { ...value.iv } } : {}),
    ...(value.iv_maxed ? { iv_maxed: { ...value.iv_maxed } } : {}),
    ...(value.ev ? { ev: { ...value.ev } } : {}),
    ...(value.stats ? { stats: { ...value.stats } } : {}),
    ...(value.owner ? { owner: { ...value.owner } } : {}),
    ...(value.markings ? { markings: normalizeOpaqueList(value.markings, "markings") } : {}),
    ...(value.first_moves ? { first_moves: [...value.first_moves] } : {}),
    ...(value.ribbons ? { ribbons: [...value.ribbons] } : {}),
    ...(Object.prototype.hasOwnProperty.call(value, "fused") ? { fused: value.fused == null ? null : snapshotPokemonRuntime(value.fused) } : {}),
    ...(Object.prototype.hasOwnProperty.call(value, "mail") ? { mail: normalizePokemonMail(value.mail) } : {}),
    ...(Object.prototype.hasOwnProperty.call(value, "mapless_bonus_stats") ? { mapless_bonus_stats: { ...value.mapless_bonus_stats } } : {}),
  };
}
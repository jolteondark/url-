import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { resolveSharedBattleAbilityItemTurnEndCanonical } from "./battle-ability-item-turn-end-shared.js";
import { resolveWeatherChipTurnEndCanonical } from "./battle-core-weather-chip-turn-end-extension.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";

const TURN_END_CHANCE_STREAM_SALT = 0x54454e44;
const TURN_END_BATTLER_STREAM_SALT = 0x9e3779b1;

function clampHp(value, maxHp) {
  return Math.min(Math.max(0, Math.trunc(Number(maxHp ?? 0))), Math.max(0, Math.trunc(Number(value ?? 0))));
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

export function materializeBattleTurnEndChanceContextRuntime(hook, context = {}) {
  const request = hook?.statusCureChanceRequest;
  if (!request) return Object.freeze({ context, evaluated: false, roll: null });
  const rollContextKey = String(request.rollContextKey ?? "");
  if (!rollContextKey) throw new Error("turn-end chance request is missing rollContextKey");
  if (hasOwn(context, rollContextKey)) {
    return Object.freeze({ context, evaluated: true, roll: Number(context[rollContextKey]) });
  }
  if (context.combatRandomSeed === undefined || context.combatRandomSeed === null) {
    throw new Error("turn-end chance request requires combatRandomSeed");
  }
  const denominator = Math.trunc(Number(request.denominator ?? 0));
  if (!Number.isInteger(denominator) || denominator <= 0) {
    throw new RangeError("turn-end chance request denominator must be a positive integer");
  }
  const battlerIndex = Math.trunc(Number(context.battlerIndex ?? 0));
  const baseSeed = Number(context.combatRandomSeed) & 0x7fffffff;
  const battlerSalt = Math.imul((Number.isFinite(battlerIndex) ? battlerIndex : 0) + 1, TURN_END_BATTLER_STREAM_SALT);
  const seed = (baseSeed ^ TURN_END_CHANCE_STREAM_SALT ^ battlerSalt) >>> 0;
  const rng = new RubyMT19937Random(seed);
  const roll = rng.randInt(denominator) / denominator;
  return Object.freeze({
    context: Object.freeze({ ...context, [rollContextKey]: roll }),
    evaluated: true,
    roll,
  });
}

export function commitBattleAbilityItemTurnEndRuntime({ pokemon, context = {} } = {}) {
  let runtime = updatePokemonRuntime(pokemon, {});
  const hpBefore = Number(runtime.hp ?? 0);
  const maxHp = Number(runtime.max_hp ?? runtime.maxHp ?? hpBefore);
  const weatherChip = resolveWeatherChipTurnEndCanonical(runtime, context);
  const hpAfterWeather = clampHp(hpBefore + Number(weatherChip.hpDelta ?? 0), maxHp);
  if (hpAfterWeather !== hpBefore) runtime = updatePokemonRuntime(runtime, { hp: hpAfterWeather });

  let hook = resolveSharedBattleAbilityItemTurnEndCanonical({ pokemon: runtime, context });
  const chance = materializeBattleTurnEndChanceContextRuntime(hook, context);
  if (chance.evaluated) {
    hook = resolveSharedBattleAbilityItemTurnEndCanonical({ pokemon: runtime, context: chance.context });
  }
  if (weatherChip.triggered !== true && hook?.triggered !== true && chance.evaluated !== true) {
    return Object.freeze({ pokemon: runtime, commit: null });
  }

  const hpBeforeHook = Number(runtime.hp ?? hpAfterWeather);
  const hpAfter = clampHp(hpBeforeHook + Number(hook?.hpDelta ?? 0), maxHp);
  let statusChanged = false;
  let statusCured = false;
  const patch = {};
  if (hpAfter !== hpBeforeHook) patch.hp = hpAfter;

  if (hook?.statusCureRequest && hpAfter > 0 && String(runtime.status ?? "NONE").toUpperCase() !== "NONE") {
    patch.status = "NONE";
    patch.status_count = 0;
    statusCured = true;
  } else if (hook?.statusRequest && hpAfter > 0 && String(runtime.status ?? "NONE").toUpperCase() === "NONE") {
    patch.status = String(hook.statusRequest.status ?? "NONE").toUpperCase();
    patch.status_count = 0;
    statusChanged = patch.status !== "NONE";
  }
  if (Object.keys(patch).length > 0) runtime = updatePokemonRuntime(runtime, patch);

  return Object.freeze({
    pokemon: runtime,
    commit: Object.freeze({
      boundary: "turn_end",
      hpBefore,
      hpAfter: Number(runtime.hp ?? hpAfter),
      hpDelta: Number(runtime.hp ?? hpAfter) - hpBefore,
      reason: hook?.reason ?? weatherChip.reason ?? null,
      weatherChip: structuredClone(weatherChip),
      statusChanged,
      statusCured,
      statusRequest: hook?.statusRequest ? structuredClone(hook.statusRequest) : null,
      statusCureRequest: hook?.statusCureRequest ? structuredClone(hook.statusCureRequest) : null,
      statusCureChanceRequest: hook?.statusCureChanceRequest ? structuredClone(hook.statusCureChanceRequest) : null,
      statusCureChanceRoll: chance.evaluated ? chance.roll : null,
      statChanges: Object.freeze(structuredClone(hook?.statChanges ?? [])),
    }),
  });
}

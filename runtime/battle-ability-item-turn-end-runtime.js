import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { resolveBattleAbilityItemHookCanonical } from "./battle-ability-item-hook-dispatch.js";
import { resolveWeatherChipTurnEndCanonical } from "./battle-core-weather-chip-turn-end-extension.js";
import { resolveTurnEndStatusItemExtensionCanonical } from "./battle-core-turn-end-status-item-extension.js";

function clampHp(value, maxHp) {
  return Math.min(Math.max(0, Math.trunc(Number(maxHp ?? 0))), Math.max(0, Math.trunc(Number(value ?? 0))));
}

export function commitBattleAbilityItemTurnEndRuntime({ pokemon, context = {} } = {}) {
  let runtime = updatePokemonRuntime(pokemon, {});
  const hpBefore = Number(runtime.hp ?? 0);
  const maxHp = Number(runtime.max_hp ?? runtime.maxHp ?? hpBefore);
  const weatherChip = resolveWeatherChipTurnEndCanonical(runtime, context);
  const hpAfterWeather = clampHp(hpBefore + Number(weatherChip.hpDelta ?? 0), maxHp);
  if (hpAfterWeather !== hpBefore) runtime = updatePokemonRuntime(runtime, { hp: hpAfterWeather });

  const hook = resolveBattleAbilityItemHookCanonical({
    hook: "turn_end",
    user: runtime,
    context,
  });
  const extension = resolveTurnEndStatusItemExtensionCanonical(runtime, context);
  if (weatherChip.triggered !== true && hook?.triggered !== true && extension.triggered !== true) {
    return Object.freeze({ pokemon: runtime, commit: null });
  }

  const hpBeforeHook = Number(runtime.hp ?? hpAfterWeather);
  const hpAfter = clampHp(
    hpBeforeHook + Number(hook?.hpDelta ?? 0) + Number(extension.hpDelta ?? 0),
    maxHp,
  );
  let statusChanged = false;
  let statusCured = false;
  const patch = {};
  if (hpAfter !== hpBeforeHook) patch.hp = hpAfter;

  if (extension.statusCureRequest && hpAfter > 0 && String(runtime.status ?? "NONE").toUpperCase() !== "NONE") {
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
      reason: extension.reason ?? hook?.reason ?? weatherChip.reason ?? null,
      weatherChip: structuredClone(weatherChip),
      statusChanged,
      statusCured,
      statusRequest: hook?.statusRequest ? structuredClone(hook.statusRequest) : null,
      statusCureRequest: extension.statusCureRequest ? structuredClone(extension.statusCureRequest) : null,
      statChanges: Object.freeze(structuredClone(hook?.statChanges ?? [])),
    }),
  });
}

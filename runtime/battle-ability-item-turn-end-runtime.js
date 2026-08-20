import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { resolveBattleAbilityItemHookCanonical } from "./battle-ability-item-hook-dispatch.js";

function clampHp(value, maxHp) {
  return Math.min(Math.max(0, Math.trunc(Number(maxHp ?? 0))), Math.max(0, Math.trunc(Number(value ?? 0))));
}

export function commitBattleAbilityItemTurnEndRuntime({ pokemon, context = {} } = {}) {
  let runtime = updatePokemonRuntime(pokemon, {});
  const hook = resolveBattleAbilityItemHookCanonical({
    hook: "turn_end",
    user: runtime,
    context,
  });
  if (hook?.triggered !== true) {
    return Object.freeze({ pokemon: runtime, commit: null });
  }

  const hpBefore = Number(runtime.hp ?? 0);
  const maxHp = Number(runtime.max_hp ?? runtime.maxHp ?? hpBefore);
  const hpAfter = clampHp(hpBefore + Number(hook.hpDelta ?? 0), maxHp);
  let statusChanged = false;
  const patch = {};
  if (hpAfter !== hpBefore) patch.hp = hpAfter;

  if (hook.statusRequest && hpAfter > 0 && String(runtime.status ?? "NONE").toUpperCase() === "NONE") {
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
      reason: hook.reason ?? null,
      statusChanged,
      statusRequest: hook.statusRequest ? structuredClone(hook.statusRequest) : null,
      statChanges: Object.freeze(structuredClone(hook.statChanges ?? [])),
    }),
  });
}

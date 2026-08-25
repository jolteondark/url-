import {
  applyBattleStatStageChangesCanonical,
  createBattleStatStageStateCanonical,
} from "./battle-core-stat-stages.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function currentDay(state) {
  return Math.max(1, Math.trunc(Number(state?.day ?? 1)));
}

export function clearExpiredSafariPowerMeal(runtime) {
  const state = stateOf(runtime);
  const day = currentDay(state);
  const mealDay = Math.trunc(Number(state.mapless_power_meal_day ?? day));
  if (mealDay !== day) {
    state.mapless_power_meal_battles = 0;
    state.mapless_power_meal_day = day;
  } else {
    state.mapless_power_meal_battles = Math.max(0, Math.trunc(Number(state.mapless_power_meal_battles ?? 0)));
    state.mapless_power_meal_day = mealDay;
  }
  return state.mapless_power_meal_battles;
}

export function setSafariPowerMeal(runtime, battles) {
  const state = stateOf(runtime);
  const count = Math.max(0, Math.trunc(Number(battles ?? 0)));
  state.mapless_power_meal_battles = count;
  state.mapless_power_meal_day = currentDay(state);
  return { battles: count, day: state.mapless_power_meal_day };
}

export function ensureSafariPowerMealBattleOpening(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed === true) return { active:false, applied:false, operations:[] };
  if (battle.mapless_power_meal_opening_checked === true) {
    return {
      active: battle.mapless_power_meal_active === true,
      applied: battle.mapless_power_meal_opening_applied === true,
      operations: [],
    };
  }

  battle.mapless_power_meal_opening_checked = true;
  clearExpiredSafariPowerMeal(runtime);
  const active = state.mapless_power_meal_battles > 0 && state.mapless_power_meal_day === currentDay(state);
  battle.mapless_power_meal_active = active;
  if (!active) return { active:false, applied:false, operations:[] };

  const projected = applyBattleStatStageChangesCanonical(
    createBattleStatStageStateCanonical(battle.stat_stages),
    [
      { subject:"user", stat:"ATTACK", delta:1 },
      { subject:"user", stat:"SPECIAL_ATTACK", delta:1 },
    ],
    0,
    1,
  );
  battle.stat_stages = projected.state;
  battle.mapless_power_meal_opening_applied = true;
  const operation = {
    op:"power_meal_battle_opening",
    battlerIndex:0,
    changes: projected.applied.map((entry) => ({ stat:entry.stat, before:entry.before, after:entry.after })),
  };
  battle.last_operations = [...(battle.last_operations ?? []), operation];
  state.last_operations = battle.last_operations;
  return { active:true, applied:true, operations:[operation] };
}

export function consumeSafariPowerMealAfterBattle(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed !== true || battle.mapless_power_meal_active !== true) {
    return { consumed:false, remaining:Math.max(0, Math.trunc(Number(state.mapless_power_meal_battles ?? 0))), operations:[] };
  }
  if (battle.mapless_power_meal_consumed === true) {
    return { consumed:false, remaining:Math.max(0, Math.trunc(Number(state.mapless_power_meal_battles ?? 0))), operations:[] };
  }
  battle.mapless_power_meal_consumed = true;
  const before = Math.max(0, Math.trunc(Number(state.mapless_power_meal_battles ?? 0)));
  const remaining = Math.max(0, before - 1);
  state.mapless_power_meal_battles = remaining;
  const operation = { op:"consume_power_meal_battle", before, remaining };
  battle.last_operations = [...(battle.last_operations ?? []), operation];
  state.last_operations = battle.last_operations;
  return { consumed:true, remaining, operations:[operation] };
}

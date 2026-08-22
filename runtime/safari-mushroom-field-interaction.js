import { resolveMushroomField } from "./mapless-normal-events-a1-flow.js";
import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";
import { ensureMaplessRunLifecycleState, finishMaplessRun, maplessPartyAllFainted } from "./mapless-run-end-lifecycle.js";
import { setMoney } from "./bag-economy-mart-flow.js";
import { healSafariPokemonFull, inflictSafariOverworldStatus } from "./safari-pokemon-healing.js";
import { safariPokemonTypes } from "./safari-pokemon-type-membership.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function usable(pokemon) { return Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0 && pokemon.egg !== true; }
function party(runtime) { return runtime.player?.party ?? []; }
function firstPoisonAppraiser(runtime) { return party(runtime).find((pokemon) => usable(pokemon) && safariPokemonTypes(pokemon).includes("POISON")) ?? null; }
function parsedAction(action) {
  const raw = String(action ?? "");
  const match = /^(eat|poison):(\d+)$/.exec(raw);
  return match ? { action: match[1], targetIndex: Number(match[2]) } : { action: raw, targetIndex: null };
}
function pokemonLabel(pokemon) { return String(pokemon?.nickname || pokemon?.species || "ポケモン"); }
function applyFlatDamage(pokemon, amount) {
  const hp = Math.max(0, Math.trunc(Number(pokemon?.hp ?? 0)) - Math.max(0, Math.trunc(Number(amount) || 0)));
  return updatePokemonRuntime(pokemon, { hp });
}
function applyMaplessBonus(pokemon, stat, amount) {
  const key = String(stat ?? "").toUpperCase();
  const delta = Math.trunc(Number(amount) || 0);
  const bonuses = { ...(pokemon.mapless_bonus_stats ?? {}) };
  bonuses[key] = Math.max(0, Math.trunc(Number(bonuses[key] ?? 0)) + delta);
  const patch = { mapless_bonus_stats: bonuses };
  if (key === "HP" && Number.isInteger(pokemon.max_hp)) {
    patch.max_hp = Math.max(1, pokemon.max_hp + delta);
    patch.hp = Math.min(patch.max_hp, Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)) + Math.max(delta, 0)));
  } else if (pokemon.stats && Object.prototype.hasOwnProperty.call(pokemon.stats, key)) {
    patch.stats = { ...pokemon.stats, [key]: Math.max(1, Math.trunc(Number(pokemon.stats[key] ?? 0)) + delta) };
  }
  return updatePokemonRuntime(pokemon, patch);
}
function finishMushroomPartyWipe(runtime) {
  const state = ensureMaplessRunLifecycleState(runtime);
  if (!state.mapless_run_active || !maplessPartyAllFainted(party(runtime))) {
    return { finished: false, overflow: false, operations: [] };
  }
  state.mapless_run_end_pending = true;
  const finished = finishMaplessRun(runtime);
  state.location = "home";
  return {
    ...finished,
    operations: [
      { op: "mark_run_end", reason: "party_wipe", source: "normal_event:mushroom_field" },
      ...(finished.operations ?? []),
      { op: "return_to_home", source: "normal_event:mushroom_field" },
    ],
  };
}

export function resolveSafariMushroomFieldInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "mushroom_field") throw new Error("mushroom_field board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", operations: [] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const parsed = parsedAction(requestedAction);
  const target = parsed.targetIndex == null ? null : party(runtime)[parsed.targetIndex] ?? null;
  if ((parsed.action === "eat" || parsed.action === "poison") && !usable(target)) {
    state.notice = "そのポケモンにはキノコを食べさせられません。";
    return { runtime, result: "target_unavailable", completed: false, operations: [], notice: state.notice, persistenceRequested: false };
  }
  const appraiser = parsed.action === "poison" ? firstPoisonAppraiser(runtime) : null;
  const scale = scalingValue(state.day);
  const owner = resolveMushroomField({
    event,
    action: parsed.action,
    scaling_value: scale,
    has_poison: Boolean(firstPoisonAppraiser(runtime)),
    appraiser_pokemon: appraiser,
    target_pokemon: target,
  });
  const applied = [];
  if (owner.result && parsed.action === "sell") {
    const requested = owner.operations.find((operation) => operation.op === "add_money")?.amount ?? 0;
    const carryClass = state.mapless_carry_class ?? "general";
    const adjusted = maplessCarryMoneyGain(requested, carryClass);
    runtime.bag ??= { slots: [], money: 0 };
    const before = Math.trunc(Number(runtime.bag.money ?? 0));
    runtime.bag.money = setMoney(before + adjusted, 9999999);
    applied.push({ op: "runtime_add_money", source: "normal_event:mushroom_field", requested, adjusted, carryClass, applied: runtime.bag.money - before });
  }
  if (owner.result && parsed.targetIndex != null) {
    for (const operation of owner.operations ?? []) {
      if (operation.op === "add_bonus") {
        party(runtime)[parsed.targetIndex] = applyMaplessBonus(party(runtime)[parsed.targetIndex], operation.stat, operation.amount);
        applied.push({ op: "runtime_add_bonus", party_index: parsed.targetIndex, stat: operation.stat, amount: operation.amount });
      } else if (operation.op === "heal_pokemon_full") {
        party(runtime)[parsed.targetIndex] = healSafariPokemonFull(party(runtime)[parsed.targetIndex]);
        applied.push({ op: "runtime_heal_pokemon_full", party_index: parsed.targetIndex });
      } else if (operation.op === "inflict_status") {
        party(runtime)[parsed.targetIndex] = inflictSafariOverworldStatus(party(runtime)[parsed.targetIndex], operation.status);
        applied.push({ op: "runtime_inflict_status", party_index: parsed.targetIndex, status: operation.status });
      } else if (operation.op === "damage_pokemon") {
        party(runtime)[parsed.targetIndex] = applyFlatDamage(party(runtime)[parsed.targetIndex], operation.amount);
        applied.push({ op: "runtime_damage_pokemon", party_index: parsed.targetIndex, amount: operation.amount });
      }
    }
  }
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  const eventOperations = [...(owner.operations ?? []).map((operation) => structuredClone(operation)), ...applied];
  state.last_operations = eventOperations;
  const label = pokemonLabel(target);
  const stat = String(event.normal_data?.eat_stat ?? "能力");
  state.notice = owner.outcome === "sold"
    ? `怪しいキノコを売り、${applied[0]?.applied ?? 0}円を得ました。`
    : owner.outcome === "poison_appraised_bonus"
      ? `どくタイプが安全なキノコを見分け、${label}の${stat}が1上がりました。`
      : owner.outcome === "eat_bonus"
        ? `${label}がキノコを食べ、${stat}が1上がりました。`
        : owner.outcome === "eat_heal"
          ? `${label}がキノコを食べ、全回復しました。`
          : owner.outcome === "eat_status"
            ? `${label}がキノコを食べ、状態異常になりました。`
            : owner.outcome === "eat_damage"
              ? `${label}がキノコを食べ、25ダメージを受けました。`
              : "怪しいキノコ畑から離れました。";

  const runEnd = owner.result && owner.outcome === "eat_damage"
    ? finishMushroomPartyWipe(runtime)
    : { finished: false, overflow: false, operations: [] };
  if (runEnd.finished) {
    state.notice = "キノコの影響で手持ちが全滅したため、今回のランは終了しました。";
    state.last_operations = [...eventOperations, ...(runEnd.operations ?? [])];
  }

  return {
    runtime,
    result: owner.outcome,
    completed: Boolean(owner.result),
    operations: state.last_operations,
    notice: state.notice,
    persistenceRequested: Boolean(owner.result) || runEnd.finished,
    owner,
    runEnd,
  };
}

export function interactiveSafariMushroomField(runtime, index) {
  const state = stateOf(runtime);
  const scale = scalingValue(state.day);
  const nominal = 400 + scale * 120;
  const carryClass = state.mapless_carry_class ?? "general";
  const displayed = maplessCarryMoneyGain(nominal, carryClass);
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) {
    state.board_revealed[index] = true;
    state.board_visited[index] = true;
    state.notice = `怪しいキノコ畑。採取して売れば${displayed}円になりそうです。`;
    return { runtime, result: "mushroom_field_ready", boundary: "normal_event", notice: state.notice, operations: [] };
  }
  const sell = confirmFn(`怪しいキノコ畑です。\nキノコを採取して${displayed}円で売りますか？\n（キャンセルで立ち去る）`);
  return { ...resolveSafariMushroomFieldInteraction(runtime, index, sell ? "sell" : "leave"), boundary: "normal_event" };
}
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { resolveCanonicalEvolutionLabV108 } from "./mapless-evolution-lab-v108.js";
import { commitCanonicalPokemonMutationV108 } from "./mapless-pokemon-mutation-v108.js";
import { resolveEvolutionLabPokemonStatContextV108 } from "./mapless-evolution-lab-stat-context-v108.js";
import { resolveEvolutionLabForceEvolutionContextV108 } from "./mapless-evolution-lab-force-evolution-context-v108.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function evolutionLabEvent(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "evolution_lab") {
    throw new Error("evolution_lab board event is required");
  }
  return event;
}

function requestsSave(operations = []) {
  return operations.some((operation) => operation?.op === "request_save");
}

function partyOf(runtime) {
  return Array.isArray(runtime?.player?.party) ? runtime.player.party : [];
}

function ownerEligibleEntries(owner) {
  return owner?.operations?.find((operation) => operation?.op === "eligible_pokemon")?.entries ?? [];
}

function normalizeAction(action) {
  if (action && typeof action === "object") {
    return {
      id:String(action.id ?? action.action ?? ""),
      pokemonIndex:Number.isInteger(action.pokemon_index) ? action.pokemon_index : Number.isInteger(action.pokemonIndex) ? action.pokemonIndex : undefined,
      species:action.species ? String(action.species) : undefined,
    };
  }
  return { id:String(action ?? ""), pokemonIndex:undefined, species:undefined };
}

function publishSelectionUi(runtime, index, mode, owner, pokemonIndex) {
  const state = stateOf(runtime);
  const eligible = ownerEligibleEntries(owner);
  let selection = null;
  if (owner?.outcome === "pokemon_selection_required") {
    selection = {
      kind:"pokemon",
      mode,
      entries:eligible.map((entry) => ({
        id:entry.id,
        index:entry.index,
        name:entry.name,
        evolutions:[...(entry.evolutions ?? [])],
      })),
    };
    state.notice = "進化装置に入れるポケモンを選んでください。";
  } else if (owner?.outcome === "evolution_selection_required") {
    const entry = eligible.find((candidate) => candidate.index === pokemonIndex) ?? null;
    selection = {
      kind:"evolution",
      mode,
      pokemonIndex,
      entries:(entry?.evolutions ?? []).map((species) => ({ id:species, species, name:species })),
    };
    state.notice = "進化先を選んでください。";
  }
  if (!selection) return null;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"evolution_lab",
    title:"進化研究所",
    message:state.notice,
    mode,
    selection,
    owner,
  };
  if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent(new CustomEvent("safari-normal-event-ui"));
  }
  return selection;
}

function commitTerminalOwner(runtime, index, owner, applied = [], reason = "evolution_lab_resolved") {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event?.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "grant_item").map((operation) => structuredClone(operation)),
    ...applied.map((operation) => structuredClone(operation)),
    { op:"request_save", reason },
  ];
  return state;
}

function preflightSingleItem(runtime, item) {
  const slots = runtime?.bag?.slots ?? [];
  const maxSlots = Number(runtime?.bag?.max_slots ?? runtime?.bag?.maxSlots ?? SAFARI_BAG_MAX_SLOTS);
  const maxPerSlot = Number(runtime?.bag?.max_per_slot ?? runtime?.bag?.maxPerSlot ?? SAFARI_BAG_MAX_PER_SLOT);
  return resolveRewardTransaction({
    pockets:{ general:{ slots, maxSlots, maxPerSlot } },
    itemMeta:{ [item]:{ valid:true, pocket:"general" } },
    items:[item],
  });
}

export function safariEvolutionLabPresentation(runtime, index) {
  const event = evolutionLabEvent(runtime, index);
  const preview = resolveCanonicalEvolutionLabV108({ event, choice:"stable", party:partyOf(runtime) });
  const eligible = ownerEligibleEntries(preview);
  const hasEligible = eligible.length > 0;
  return {
    title:"進化研究所",
    message:hasEligible
      ? "進化装置があります。安定出力と最大出力を利用できます。canonical ownerが決めた結果をPokémon Runtimeへ反映します。"
      : "進化装置があります。進化対象のポケモンはいません。部品回収または離脱を選べます。",
    actions:[
      { id:"stable", label:"安定出力", disabled:!hasEligible },
      { id:"maximum", label:"最大出力", disabled:!hasEligible },
      { id:"parts", label:"部品を回収する" },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
    eligiblePokemon:eligible.map((entry) => ({ ...entry, evolutions:[...(entry.evolutions ?? [])] })),
  };
}

export function resolveSafariEvolutionLabInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = evolutionLabEvent(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const choice = normalizeAction(action);
  if (choice.id === "stable" || choice.id === "maximum") {
    const owner = resolveCanonicalEvolutionLabV108({
      event,
      choice:choice.id,
      party:partyOf(runtime),
      selected_index:choice.pokemonIndex,
      selected_species:choice.species,
    });
    if (!owner.completed) {
      const selection = publishSelectionUi(runtime, index, choice.id, owner, choice.pokemonIndex);
      if (selection) {
        return {
          runtime,
          result:owner.outcome,
          completed:false,
          terminal:false,
          operations:owner.operations ?? [],
          persistenceRequested:false,
          notice:state.notice,
          selection,
          owner,
        };
      }
      state.notice = owner.outcome === "no_eligible_pokemon"
        ? "進化できるポケモンがいません。"
        : "進化装置の選択を完了できませんでした。";
      return {
        runtime,
        result:owner.outcome,
        completed:false,
        terminal:false,
        operations:owner.operations ?? [],
        persistenceRequested:false,
        notice:state.notice,
        owner,
      };
    }

    const mutation = (owner.operations ?? []).find((operation) => operation?.op === "force_evolve" || operation?.op === "lower_level");
    if (mutation) {
      const pokemonIndex = Number(mutation.pokemon_index);
      const party = partyOf(runtime);
      const pokemon = Number.isInteger(pokemonIndex) ? party[pokemonIndex] : null;
      if (!pokemon) {
        state.notice = "対象ポケモンをPartyから取得できませんでした。";
        return {
          runtime,
          result:"selected_pokemon_unavailable",
          completed:false,
          terminal:false,
          operations:owner.operations ?? [],
          persistenceRequested:false,
          notice:state.notice,
          owner,
        };
      }
      const statContext = mutation.op === "force_evolve"
        ? resolveEvolutionLabForceEvolutionContextV108(pokemon, mutation)
        : resolveEvolutionLabPokemonStatContextV108(pokemon);
      if (!statContext.success) {
        state.notice = mutation.op === "force_evolve"
          ? "進化先に必要なcanonical species contextを取得できないため、イベントを未消費で停止しました。"
          : "レベル変化に必要なcanonical stat contextを取得できませんでした。";
        return {
          runtime,
          result:statContext.result,
          completed:false,
          terminal:false,
          operations:owner.operations ?? [],
          persistenceRequested:false,
          notice:state.notice,
          owner,
          statContext,
        };
      }
      const committed = commitCanonicalPokemonMutationV108(pokemon, mutation, statContext);
      if (!committed.success) {
        state.notice = mutation.op === "force_evolve"
          ? "Pokémon Runtimeへcanonical進化を反映できないため、イベントを未消費で停止しました。"
          : "Pokémon Runtimeへレベル変化を反映できませんでした。";
        return {
          runtime,
          result:committed.result,
          completed:false,
          terminal:false,
          operations:owner.operations ?? [],
          persistenceRequested:false,
          notice:state.notice,
          owner,
          mutation:committed,
        };
      }
      party[pokemonIndex] = committed.pokemon;
      const applied = [{
        op:"commit_pokemon_mutation",
        pokemon_index:pokemonIndex,
        mutation:mutation.op,
        result:committed.result,
        previous_species:committed.previousSpecies,
        species:committed.species,
        previous_level:committed.previousLevel,
        level:committed.level,
      }];
      commitTerminalOwner(runtime, index, owner, applied, `evolution_lab_${owner.outcome}`);
      const label = pokemon.nickname ?? pokemon.name ?? pokemon.species;
      state.notice = mutation.op === "force_evolve"
        ? `${label}が${committed.species}に進化しました。`
        : `${label}のレベルが${committed.previousLevel}から${committed.level}に変化しました。`;
      return {
        runtime,
        result:owner.outcome,
        completed:true,
        terminal:true,
        operations:state.last_operations,
        persistenceRequested:requestsSave(state.last_operations),
        notice:state.notice,
        owner,
        mutation:committed,
      };
    }

    commitTerminalOwner(runtime, index, owner, [], choice.id === "maximum" ? "evolution_lab_maximum_no_change" : "evolution_lab_stable_no_change");
    state.notice = "装置は作動しましたが、ポケモンに変化はありませんでした。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      terminal:true,
      operations:state.last_operations,
      persistenceRequested:requestsSave(state.last_operations),
      notice:state.notice,
      owner,
    };
  }
  if (choice.id !== "parts" && choice.id !== "leave") {
    return { runtime, result:"unsupported_action", completed:false, operations:[], persistenceRequested:false };
  }

  if (choice.id === "leave") {
    const owner = resolveCanonicalEvolutionLabV108({ event, choice:"leave" });
    commitTerminalOwner(runtime, index, owner, [], "evolution_lab_left");
    state.notice = "進化研究所を立ち去りました。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      terminal:true,
      operations:state.last_operations,
      persistenceRequested:requestsSave(state.last_operations),
      notice:state.notice,
      owner,
    };
  }

  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const owner = resolveCanonicalEvolutionLabV108({
    event,
    choice:"parts",
    random_int:(limit) => borrowSafariSharedRunRandomInt(runtime, limit),
  });
  const grant = (owner.operations ?? []).find((operation) => operation?.op === "grant_item");
  if (!grant?.item) {
    commitTerminalOwner(runtime, index, owner, [], "evolution_lab_parts_empty");
    state.notice = "回収できる部品はありませんでした。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      terminal:true,
      operations:state.last_operations,
      persistenceRequested:requestsSave(state.last_operations),
      notice:state.notice,
      owner,
    };
  }

  const reward = preflightSingleItem(runtime, grant.item);
  if (!reward.success) {
    state.preview_encounter_counter = counter;
    state.notice = "バッグに空きがないため、部品を回収しませんでした。";
    return {
      runtime,
      result:reward.result,
      completed:false,
      terminal:false,
      reward,
      operations:(reward.operations ?? []).map((operation) => structuredClone(operation)),
      persistenceRequested:false,
      notice:state.notice,
      owner,
    };
  }
  const receipt = commitSafariBagEconomyReceipt(runtime, { reward });
  if (!receipt.success) {
    state.preview_encounter_counter = counter;
    state.notice = "バッグに部品を追加できませんでした。";
    return {
      runtime,
      result:receipt.result,
      completed:false,
      terminal:false,
      operations:(receipt.operations ?? []).map((operation) => structuredClone(operation)),
      persistenceRequested:false,
      notice:state.notice,
      owner,
    };
  }
  commitTerminalOwner(runtime, index, owner, receipt.operations ?? [], "evolution_lab_parts_recovered");
  state.notice = `${grant.item}を回収しました。`;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    terminal:true,
    rewardItem:grant.item,
    operations:state.last_operations,
    persistenceRequested:requestsSave(state.last_operations),
    notice:state.notice,
    owner,
  };
}

export function interactiveSafariEvolutionLab(runtime, index) {
  const state = stateOf(runtime);
  const ui = safariEvolutionLabPresentation(runtime, index);
  state.notice = ui.message;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"evolution_lab",
    ...ui,
  };
  if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent(new CustomEvent("safari-normal-event-ui"));
  }
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) {
    return {
      runtime,
      result:"evolution_lab_ready",
      boundary:"normal_event",
      notice:state.notice,
      availableActions:ui.actions.map((entry) => entry.id),
      operations:[],
    };
  }
  const recover = confirmFn(`${ui.message}\n\n部品を回収しますか？`);
  return resolveSafariEvolutionLabInteraction(runtime, index, recover ? "parts" : "leave");
}

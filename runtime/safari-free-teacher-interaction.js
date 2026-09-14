import { projectCanonicalTeacherMovesV108 } from "./mapless-teacher-move-projection-v108.js";
import { resolveCanonicalFreeTeacherV108 } from "./mapless-free-teacher-v108.js";

const FREE_TEACHERS = Object.freeze({
  bloodline_grandmother:Object.freeze({ kind:"egg", title:"血統のおばあさん" }),
  retired_warrior:Object.freeze({ kind:"tutor", title:"引退した戦士" }),
});

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function teacherEvent(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  const meta = FREE_TEACHERS[event?.normal_event_id];
  if (!event || event.kind !== "normal_event" || !meta) throw new Error("free-teacher board event is required");
  return { event, meta };
}

function partyOf(runtime) {
  return Array.isArray(runtime?.player?.party) ? runtime.player.party : [];
}

function pokemonLabel(pokemon, index) {
  return String(pokemon?.nickname ?? pokemon?.name ?? pokemon?.species ?? `Party ${index + 1}`);
}

function teacherSeed(event) {
  return Number(event?.normal_data?.teacher_seed ?? 0);
}

function normalSeed(event) {
  return Number(event?.normal_seed ?? 0);
}

function previewForPokemon(event, meta, pokemon) {
  const candidateMoves = projectCanonicalTeacherMovesV108(pokemon, meta.kind);
  return resolveCanonicalFreeTeacherV108({
    pokemon,
    candidate_moves:candidateMoves,
    teacher_seed:teacherSeed(event),
    normal_seed:normalSeed(event),
  });
}

export function safariFreeTeacherCandidates(runtime, index) {
  const { event, meta } = teacherEvent(runtime, index);
  return partyOf(runtime).map((pokemon, pokemonIndex) => {
    const owner = previewForPokemon(event, meta, pokemon);
    return {
      index:pokemonIndex,
      name:pokemonLabel(pokemon, pokemonIndex),
      species:String(pokemon?.species ?? ""),
      eligible:owner.result !== "no_eligible_moves",
      selectedMoveId:owner.selectedMoveId ?? null,
    };
  }).filter((entry) => entry.eligible);
}

export function safariFreeTeacherPresentation(runtime, index) {
  const { meta } = teacherEvent(runtime, index);
  const entries = safariFreeTeacherCandidates(runtime, index);
  return {
    title:meta.title,
    message:entries.length > 0
      ? "技を教えるポケモンを選んでください。"
      : "今は教えられる技があるポケモンはいません。",
    selection:{ kind:"free_teacher_pokemon", entries },
  };
}

function nonTerminal(runtime, result, extra = {}) {
  return {
    runtime,
    result,
    completed:false,
    terminal:false,
    operations:[],
    persistenceRequested:false,
    ...extra,
  };
}

function commitSuccess(runtime, index, pokemonIndex, owner) {
  const state = stateOf(runtime);
  const event = state.board_events[index];
  const party = partyOf(runtime);
  party[pokemonIndex] = owner.pokemon;
  event.normal_resolved = true;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = true;
  state.notice = owner.result === "move_replaced"
    ? `${owner.replacedMoveId}を忘れて${owner.moveId}を覚えました。`
    : `${owner.moveId}を覚えました。`;
  state.last_operations = [
    {
      op:"free_teacher_move_learned",
      event_id:event.normal_event_id,
      pokemon_index:pokemonIndex,
      move_id:owner.moveId,
      replaced_move_id:owner.replacedMoveId ?? null,
    },
    { op:"request_save", reason:`${event.normal_event_id}_resolved` },
  ];
  return {
    runtime,
    result:owner.result,
    completed:true,
    terminal:true,
    operations:state.last_operations,
    persistenceRequested:true,
    notice:state.notice,
    owner,
  };
}

export function resolveSafariFreeTeacherInteraction(runtime, index, action = {}) {
  const state = stateOf(runtime);
  const { event, meta } = teacherEvent(runtime, index);
  if (state.battle && !state.battle.completed) return nonTerminal(runtime, "battle_active");
  if (state.shop) return nonTerminal(runtime, "shop_active");
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, terminal:true, operations:[], persistenceRequested:false };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  if (action?.cancelled === true || action === "leave" || action?.id === "leave") {
    state.notice = "技を教わらずに立ち去りました。";
    return nonTerminal(runtime, "cancelled", { completed:true, notice:state.notice });
  }

  const pokemonIndex = Number(action?.pokemonIndex ?? action?.pokemon_index);
  const party = partyOf(runtime);
  if (!Number.isInteger(pokemonIndex) || pokemonIndex < 0 || pokemonIndex >= party.length) {
    const entries = safariFreeTeacherCandidates(runtime, index);
    state.notice = entries.length > 0 ? "技を教えるポケモンを選んでください。" : "今は教えられる技があるポケモンはいません。";
    return nonTerminal(runtime, entries.length > 0 ? "pokemon_selection_required" : "no_eligible_pokemon", {
      notice:state.notice,
      selection:{ kind:"free_teacher_pokemon", entries },
    });
  }

  const pokemon = party[pokemonIndex];
  const candidateMoves = projectCanonicalTeacherMovesV108(pokemon, meta.kind);
  const replacementIndex = action?.replacementIndex ?? action?.replacement_index ?? null;
  const owner = resolveCanonicalFreeTeacherV108({
    pokemon,
    candidate_moves:candidateMoves,
    teacher_seed:teacherSeed(event),
    normal_seed:normalSeed(event),
    replacement_index:replacementIndex,
    cancelled:action?.replacementCancelled === true || action?.replacement_cancelled === true,
  });

  if (owner.success) return commitSuccess(runtime, index, pokemonIndex, owner);
  if (owner.result === "move_replacement_required") {
    state.notice = `${owner.selectedMoveId}を覚えるため、忘れる技を選んでください。`;
    return nonTerminal(runtime, owner.result, {
      notice:state.notice,
      owner,
      selection:{
        kind:"free_teacher_move_replacement",
        pokemonIndex,
        selectedMoveId:owner.selectedMoveId,
        entries:(owner.replacementChoices ?? []).map((moveId, replacementIndex) => ({ id:moveId, index:replacementIndex, name:moveId })),
      },
    });
  }
  if (owner.result === "move_learn_cancelled") {
    state.notice = "技を忘れさせるのをやめました。";
    return nonTerminal(runtime, owner.result, { notice:state.notice, owner });
  }
  if (owner.result === "no_eligible_moves") {
    state.notice = "そのポケモンに今教えられる技はありません。";
    return nonTerminal(runtime, owner.result, { notice:state.notice, owner });
  }
  state.notice = `技を教えられませんでした: ${owner.result}`;
  return nonTerminal(runtime, owner.result, { notice:state.notice, owner });
}

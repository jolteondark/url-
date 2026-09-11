import { borrowSafariSharedRunRandomInt } from "./safari-encounter-randomization.js";

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function replaceableIndexes(board) {
  if (!Array.isArray(board)) return [];
  const counts = new Map();
  for (const event of board) {
    if (!event) continue;
    counts.set(event.kind, Number(counts.get(event.kind) ?? 0) + 1);
  }

  const preferred = [];
  const fallback = [];
  for (let index = 0; index < board.length; index += 1) {
    const event = board[index];
    if (!event || event.kind === "next_day") continue;
    if (event.kind === "wild" && Number(counts.get("wild") ?? 0) <= 1) continue;
    if (event.kind === "trainer" && Number(counts.get("trainer") ?? 0) <= 1) continue;
    if (["house", "tavern", "treasure"].includes(event.kind)) continue;
    if (["center", "shop", "egg_shop", "miner", "delta_exchange", "type_event", "normal_event"].includes(event.kind)) {
      fallback.push(index);
    } else {
      preferred.push(index);
    }
  }
  return preferred.length > 0 ? preferred : fallback;
}

export function materializeTreasureMapForDayV108(runtime) {
  const state = stateOf(runtime);
  const day = Math.max(1, Math.trunc(Number(state.day) || 1));
  const operations = [];
  let map = state.mapless_treasure_map;

  if (!map || typeof map !== "object" || Array.isArray(map)) {
    return { runtime, placed:false, expired:false, index:null, operations };
  }
  map = clone(map);

  if (map.placed_day != null && Number(map.placed_day) < day) {
    state.mapless_treasure_map = null;
    operations.push(
      { op:"clear_treasure_map", reason:"missed_placed_day", placed_day:Number(map.placed_day), current_day:day },
      { op:"request_save", reason:"treasure_map_expired" },
    );
    return { runtime, placed:false, expired:true, index:null, operations };
  }
  if (map.placed_day != null) {
    state.mapless_treasure_map = map;
    return { runtime, placed:false, expired:false, index:null, operations };
  }

  const dueDay = Math.trunc(Number(map.due_day) || 0);
  if (dueDay < day) {
    state.mapless_treasure_map = null;
    operations.push(
      { op:"clear_treasure_map", reason:"missed_due_day", due_day:dueDay, current_day:day },
      { op:"request_save", reason:"treasure_map_expired" },
    );
    return { runtime, placed:false, expired:true, index:null, operations };
  }
  if (dueDay > day) {
    state.mapless_treasure_map = map;
    return { runtime, placed:false, expired:false, index:null, operations };
  }

  const choices = replaceableIndexes(state.board_events ?? []);
  if (choices.length === 0) {
    state.mapless_treasure_map = map;
    operations.push({ op:"treasure_map_placement_skipped", reason:"no_replaceable_board_slot" });
    return { runtime, placed:false, expired:false, index:null, operations };
  }

  const index = choices[borrowSafariSharedRunRandomInt(runtime, choices.length)];
  const normalData = {
    fake:Boolean(map.fake),
    purchase_day:Number(map.purchase_day),
    due_day:dueDay,
    price:Math.max(0, Math.trunc(Number(map.price) || 0)),
    seed:Math.trunc(Number(map.seed) || 0),
    placed_day:day,
  };
  const event = {
    kind:"normal_event",
    type:null,
    slot:index,
    normal_event_id:"treasure_map_result",
    normal_seed:normalData.seed,
    normal_resolved:false,
    normal_data:normalData,
  };

  state.board_events[index] = event;
  if (Array.isArray(state.board_revealed)) state.board_revealed[index] = true;
  map.placed_day = day;
  state.mapless_treasure_map = map;
  operations.push(
    { op:"replace_board_event", index, event_id:"treasure_map_result", replaced_by:"scheduled_normal_event" },
    { op:"set_treasure_map", value:clone(map) },
    { op:"request_save", reason:"treasure_map_result_placed" },
  );
  return { runtime, placed:true, expired:false, index, event:clone(event), operations };
}

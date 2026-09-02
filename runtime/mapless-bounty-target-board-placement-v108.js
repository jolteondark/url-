import { RubyMT19937Random } from "./ruby-mt19937-random.js";
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

function replaceableIndexes(board, blocked = []) {
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
    if (!event || blocked.includes(index) || event.kind === "next_day") continue;
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

function canonicalPlacementChance(elapsedDays) {
  if (elapsedDays < 1) return 0;
  if (elapsedDays >= 3) return 100;
  return elapsedDays === 2 ? 50 : 25;
}

function canonicalBountyRoll(bounty, day) {
  const seed = (Number(bounty?.seed ?? 0) ^ Math.imul(day, 1_000_003)) & 0x7fffffff;
  const rng = new RubyMT19937Random(seed);
  return { seed, roll: rng.randInt(100) };
}

function canonicalNormalSeed(runtime, day) {
  const globalRoll = borrowSafariSharedRunRandomInt(runtime, 0x7fffffff);
  return ((((day + 31) * 1_000_003) ^ globalRoll) & 0x7fffffff) >>> 0;
}

export function placeSafariBountyTargetForDayV108(runtime) {
  const state = stateOf(runtime);
  const day = Math.max(1, Math.trunc(Number(state.day) || 1));
  const operations = [];
  let bounty = state.mapless_bounty;

  if (!bounty || typeof bounty !== "object" || Array.isArray(bounty)) {
    return { runtime, placed:false, expired:false, index:null, operations };
  }
  bounty = clone(bounty);

  if (bounty.placed_day != null && Number(bounty.placed_day) < day) {
    state.mapless_bounty = null;
    operations.push(
      { op:"clear_bounty", reason:"missed_placed_day", placed_day:Number(bounty.placed_day), current_day:day },
      { op:"request_save", reason:"bounty_target_expired" },
    );
    return { runtime, placed:false, expired:true, index:null, operations };
  }
  if (bounty.placed_day != null) {
    state.mapless_bounty = bounty;
    return { runtime, placed:false, expired:false, index:null, operations };
  }

  const elapsed = day - Math.trunc(Number(bounty.accepted_day) || 0);
  const chance = canonicalPlacementChance(elapsed);
  if (chance <= 0) {
    state.mapless_bounty = bounty;
    return { runtime, placed:false, expired:false, index:null, operations };
  }

  const placement = canonicalBountyRoll(bounty, day);
  operations.push({ op:"bounty_target_placement_roll", seed:placement.seed, value:placement.roll, chance, elapsed_days:elapsed });
  if (placement.roll >= chance) {
    state.mapless_bounty = bounty;
    return { runtime, placed:false, expired:false, index:null, operations };
  }

  const choices = replaceableIndexes(state.board_events ?? []);
  if (choices.length === 0) {
    state.mapless_bounty = bounty;
    operations.push({ op:"bounty_target_placement_skipped", reason:"no_replaceable_board_slot" });
    return { runtime, placed:false, expired:false, index:null, operations };
  }

  const choiceOffset = borrowSafariSharedRunRandomInt(runtime, choices.length);
  const index = choices[choiceOffset];
  const normalSeed = canonicalNormalSeed(runtime, day);
  const normalData = {
    ...clone(bounty),
    type:bounty.type ?? null,
    reward:Math.max(0, Math.trunc(Number(bounty.reward) || 0)),
    seed:Math.trunc(Number(bounty.seed) || 0),
  };
  const event = {
    kind:"normal_event",
    type:null,
    slot:index,
    normal_event_id:"bounty_target",
    normal_seed:normalSeed,
    normal_resolved:false,
    normal_data:normalData,
  };

  state.board_events[index] = event;
  if (Array.isArray(state.board_revealed)) state.board_revealed[index] = true;
  bounty.placed_day = day;
  state.mapless_bounty = bounty;
  operations.push(
    { op:"replace_board_event", index, event_id:"bounty_target", replaced_by:"scheduled_normal_event" },
    { op:"set_bounty", value:clone(bounty) },
    { op:"request_save", reason:"bounty_target_placed" },
  );
  return { runtime, placed:true, expired:false, index, event:clone(event), operations };
}

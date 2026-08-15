import { applyNextDayTransition } from "./mapless-day-board-next-day.js";
import { assembleDayBoard } from "./mapless-day-board-generation.js";

export function advanceDayAndRegenerateBoard(input) {
  const { day, selected_index: selectedIndex, confirmed, generation } = input;
  const transition = applyNextDayTransition(day, selectedIndex, confirmed);

  if (!confirmed) {
    return {
      day: transition.day,
      selected_index: transition.selected_index,
      board_regenerated: false,
      board_kinds: null,
      board_revealed: null,
      board_consumed: null,
      notice: transition.notice
    };
  }

  if (!generation) throw new Error("generation decisions are required after confirmation");
  const board = assembleDayBoard({
    day: transition.day,
    pre_shuffle_kinds: generation.pre_shuffle_kinds,
    shuffle_order: generation.shuffle_order,
    next_day_index: generation.next_day_index
  });

  return {
    day: transition.day,
    selected_index: transition.selected_index,
    board_regenerated: true,
    board_kinds: board.board_kinds,
    board_revealed: board.board_revealed,
    board_consumed: board.board_consumed,
    notice: transition.notice
  };
}

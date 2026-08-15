export function applyNextDayTransition(day, selectedIndex, confirmed) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError('day must be >= 1');
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 7) throw new RangeError('selectedIndex must be 0..7');
  if (typeof confirmed !== 'boolean') throw new TypeError('confirmed must be boolean');
  if (!confirmed) {
    return {
      day,
      selected_index: selectedIndex,
      board_regenerated: false,
      revealed_reset: false,
      consumed_reset: false,
      notice: 'まだこの日を探索できます。'
    };
  }
  const nextDay = Math.max(day + 1, 1);
  return {
    day: nextDay,
    selected_index: 0,
    board_regenerated: true,
    revealed_reset: true,
    consumed_reset: true,
    notice: `第${nextDay}日になりました。`
  };
}

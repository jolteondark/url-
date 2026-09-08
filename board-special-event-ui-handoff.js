function boardButtonIndex(event) {
  const button = event?.target?.closest?.("button[data-board-index]");
  if (!button) return null;
  const index = Number(button.dataset.boardIndex);
  return Number.isInteger(index) ? index : null;
}

function activeUiMatches(runtime, index, beforeUi) {
  const ui = globalThis.__maplessNormalEventUi;
  return Boolean(ui
    && ui !== beforeUi
    && ui.runtime === runtime
    && Number(ui.boardIndex) === index);
}

async function publishWhenOpened() {
  return false;
}

export { activeUiMatches, boardButtonIndex, publishWhenOpened };

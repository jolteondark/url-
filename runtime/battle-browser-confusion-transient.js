export * from "./battle-browser-confusion-transient-pre-status-cure-berry.js";

import {
  projectBrowserBattleConfusionAfterRound as projectBrowserBattleConfusionAfterRoundBase,
} from "./battle-browser-confusion-transient-pre-status-cure-berry.js";
import { commitHeldStatusCureBerryCanonical } from "./item-held-status-cure-berry-effects.js";

export function projectBrowserBattleConfusionAfterRound(input = {}) {
  const projected = projectBrowserBattleConfusionAfterRoundBase(input);
  const playerBeforeBerry = projected.player;
  const foeBeforeBerry = projected.foe;
  const player = commitHeldStatusCureBerryCanonical({
    pokemon: playerBeforeBerry,
    confusionTurns: projected.turns?.player ?? 0,
    opposingPokemon: foeBeforeBerry,
  });
  const foe = commitHeldStatusCureBerryCanonical({
    pokemon: foeBeforeBerry,
    confusionTurns: projected.turns?.foe ?? 0,
    opposingPokemon: playerBeforeBerry,
  });
  return {
    ...projected,
    player: player.pokemon,
    foe: foe.pokemon,
    turns: Object.freeze({ player: player.confusionTurns, foe: foe.confusionTurns }),
    heldStatusCureBerry: Object.freeze({
      player: player.resolution,
      foe: foe.resolution,
    }),
  };
}

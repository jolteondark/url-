export * from "./safari-playable-integration-ai.js";

import { resolveSafariBattleRound as resolveSafariBattleRoundBase } from "./safari-playable-integration-ai.js";

function lastHpAfter(operations, target) {
  let hp = null;
  for (const operation of operations ?? []) {
    if (operation?.target !== target) continue;
    if ((operation.op === "reduce_hp" || operation.op === "reduce_self_hp") && Number.isFinite(Number(operation.hpAfter))) {
      hp = Math.max(0, Math.trunc(Number(operation.hpAfter)));
    } else if ((operation.op === "faint" || operation.op === "faint_self")) {
      hp = 0;
    }
  }
  return hp;
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const result = resolveSafariBattleRoundBase(runtime, selectedMoveId);
  const battle = runtime?.variables?.mapless?.battle;
  if (!battle) return result;

  const foeHp = lastHpAfter(result?.operations, "foe");
  if (foeHp !== null && battle.foe) battle.foe.hp = Math.min(Number(battle.foe.max_hp ?? foeHp), foeHp);

  const playerHp = lastHpAfter(result?.operations, "player");
  if (playerHp !== null && runtime?.player?.party?.[0]) {
    const player = runtime.player.party[0];
    player.hp = Math.min(Number(player.max_hp ?? playerHp), playerHp);
  }

  return result;
}

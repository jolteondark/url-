function num(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveEndOfBattleCanonical(input = {}) {
  const oldDecision = num(input.decision, 0);
  let decision = oldDecision;
  const caughtPokemonCount = Math.max(0, num(input.caughtPokemonCount, 0));
  const wildBattle = Boolean(input.wildBattle);
  const trainerBattle = Boolean(input.trainerBattle);
  const internalBattle = Boolean(input.internalBattle);
  const canLose = input.canLose === undefined ? true : Boolean(input.canLose);
  const opponentCount = Math.max(0, num(input.opponentCount, Array.isArray(input.opponents) ? input.opponents.length : 0));
  const operations = [];

  if (decision === 1 && wildBattle && caughtPokemonCount > 0) {
    decision = 4;
    operations.push({ op: "set_decision_caught", from: 1, decision: 4 });
  }

  if (oldDecision === 1) {
    operations.push({ op: "debug_battle_result", result: "win" });
    if (trainerBattle) {
      operations.push({ op: "trainer_battle_success_request" });
      if (opponentCount >= 1 && opponentCount <= 3) operations.push({ op: "display_trainer_defeated_request", opponentCount });
      for (let i = 0; i < opponentCount; i += 1) {
        operations.push({ op: "show_opponent_request", opponentIndex: i });
        operations.push({ op: "display_opponent_lose_text_request", opponentIndex: i });
      }
    }
    if (decision !== 4) operations.push({ op: "gain_money_request", reason: "battle_win" });
    if (trainerBattle && caughtPokemonCount > 0) operations.push({ op: "show_opponent_request", opponentIndex: opponentCount, reason: "hide_remaining_trainer" });
  } else if (oldDecision === 2 || oldDecision === 5) {
    operations.push({ op: "debug_battle_result", result: oldDecision === 2 ? "loss" : "draw" });
    if (internalBattle) {
      operations.push({ op: "display_no_able_pokemon_request" });
      if (trainerBattle && opponentCount >= 1 && opponentCount <= 3) operations.push({ op: "display_trainer_loss_request", opponentCount });
      operations.push({ op: "lose_money_request", reason: "battle_loss_or_draw" });
      if (!canLose) operations.push({ op: "display_blackout_request" });
    } else if (decision === 2 && opponentCount > 0) {
      for (let i = 0; i < opponentCount; i += 1) {
        operations.push({ op: "show_opponent_request", opponentIndex: i });
        operations.push({ op: "display_opponent_win_text_request", opponentIndex: i });
      }
    }
  } else if (oldDecision === 4) {
    operations.push({ op: "debug_battle_result", result: "caught" });
    if (!Boolean(input.gainExpForCapture)) operations.push({ op: "wild_battle_success_request" });
  }

  operations.push({ op: "record_store_caught_pokemon_request" });
  if (decision === 4) operations.push({ op: "gain_money_request", reason: "capture_pay_day" });

  if (internalBattle) {
    const party = (Array.isArray(input.pokerusParty) ? input.pokerusParty : []).map((entry) => ({
      present: entry?.present !== false,
      stage: num(entry?.stage, 0),
      strain: num(entry?.strain, 0),
    }));
    const infected = [];
    for (let i = 0; i < party.length; i += 1) if (party[i].present && party[i].stage === 1) infected.push(i);
    const rolls = Array.isArray(input.pokerusRolls) ? input.pokerusRolls : [];
    let rollIndex = 0;
    const trySpread = (from, to, strain) => {
      if (to < 0 || to >= party.length || !party[to].present || party[to].stage !== 0) return;
      const roll = rollIndex < rolls.length ? num(rolls[rollIndex], -1) : -1;
      operations.push({ op: "pokerus_roll", fromPartyIndex: from, toPartyIndex: to, roll });
      rollIndex += 1;
      if (roll === 0) {
        operations.push({ op: "give_pokerus_request", fromPartyIndex: from, toPartyIndex: to, strain });
        party[to].stage = 1;
        party[to].strain = strain;
      }
    };
    for (const idx of infected) {
      const strain = party[idx].strain;
      if (idx > 0) trySpread(idx, idx - 1, strain);
      if (idx < party.length - 1) trySpread(idx, idx + 1, strain);
    }
  }

  operations.push({ op: "scene_end_battle", decision });
  for (const battler of Array.isArray(input.battlers) ? input.battlers : []) {
    if (!battler || battler.present === false) continue;
    const battlerIndex = num(battler.index, -1);
    operations.push({ op: "cancel_choice_request", battlerIndex });
    if (Boolean(battler.abilityActive)) operations.push({ op: "switch_out_ability_request", battlerIndex, endBattle: true });
  }
  for (const [partyIndex, pkmn] of (Array.isArray(input.party) ? input.party : []).entries()) {
    if (!pkmn || pkmn.present === false) continue;
    operations.push({ op: "on_leaving_battle_request", partyIndex, usedInBattle: Boolean(pkmn.usedInBattle), endBattle: true });
    operations.push({ op: "restore_initial_item_request", partyIndex, item: pkmn.initialItem ?? null });
  }
  operations.push({ op: "end_of_battle_complete", decision });
  return { decision, oldDecision, operations };
}

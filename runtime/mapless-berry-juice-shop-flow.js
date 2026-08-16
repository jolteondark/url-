function finish(event, operations, outcome) {
  event.normal_resolved = true;
  operations.push({ op: 'finish_event' });
  return { event, operations, result: true, outcome, uses: Number(event.normal_data.uses || 0) };
}
function stopped(event, operations, outcome) {
  return { event, operations, result: false, outcome, uses: Number(event.normal_data.uses || 0) };
}
export function resolveBerryJuiceShop(input = {}) {
  const event = { ...(input.event || {}) };
  event.normal_data = { ...((input.event || {}).normal_data || {}) };
  const data = event.normal_data;
  data.uses = Number(data.uses || 0);
  const attempts = Array.isArray(input.attempts) ? input.attempts : [];
  const operations = [];
  let cursor = 0;
  while (true) {
    if (data.uses >= 3) {
      operations.push({ op: 'juice_limit_reached', uses: data.uses });
      return finish(event, operations, 'limit_reached');
    }
    operations.push({ op: 'present_juice_choices', remaining: 3 - data.uses, actions: ['basic','upper','status','rare','leave'] });
    if (cursor >= attempts.length) return stopped(event, operations, 'input_exhausted');
    const attempt = attempts[cursor++];
    const choice = attempt.choice;
    if (choice === 'cancel') return stopped(event, operations, 'cancelled');
    if (choice === 'leave' || !choice) return finish(event, operations, data.uses > 0 ? 'left_after_use' : 'left');
    let success = false;
    if (choice === 'basic') {
      const total = Number(attempt.berry_total || 0);
      operations.push({ op: 'check_berry_count', recipe: 'basic', required: 3, available: total });
      if (total >= 3) {
        const rewards = Array.isArray(attempt.rewards) ? attempt.rewards.filter(Boolean) : [];
        operations.push({ op: 'resolve_juice_rewards', recipe: 'basic', candidates: 'DRINK_ITEMS+POTION+SUPERPOTION', rewards });
        if (rewards.length === 2) {
          const canAdd = attempt.can_add_result !== false;
          operations.push({ op: 'bag_can_add_items', items: rewards, result: canAdd });
          if (canAdd) {
            const consumed = attempt.consume_result !== false;
            operations.push({ op: 'consume_berries', quantity: 3, result: consumed });
            if (consumed) {
              const granted = attempt.grant_result !== false;
              operations.push({ op: 'grant_items', items: rewards, result: granted });
              success = granted;
            }
          }
        }
      }
    } else if (choice === 'upper') {
      const total = Number(attempt.berry_total || 0);
      operations.push({ op: 'check_berry_count', recipe: 'upper', required: 5, available: total });
      if (total >= 5) {
        const reward = attempt.reward || null;
        operations.push({ op: 'resolve_juice_reward', recipe: 'upper', candidates: ['LEMONADE','MOOMOOMILK','HYPERPOTION','MAXPOTION'], reward });
        if (reward) {
          const canAdd = attempt.can_add_result !== false;
          operations.push({ op: 'bag_can_add_items', items: [reward], result: canAdd });
          if (canAdd) {
            const consumed = attempt.consume_result !== false;
            operations.push({ op: 'consume_berries', quantity: 5, result: consumed });
            if (consumed) {
              const granted = attempt.grant_result !== false;
              operations.push({ op: 'grant_items', items: [reward], result: granted });
              success = granted;
            }
          }
        }
      }
    } else if (choice === 'status') {
      const eligible = Number(attempt.status_berry_total || 0);
      operations.push({ op: 'check_status_berries', required: 3, available: eligible });
      if (eligible >= 3) {
        const fullHealExists = attempt.fullheal_exists !== false;
        const canAdd = attempt.can_add_result !== false;
        operations.push({ op: 'check_item_exists', item: 'FULLHEAL', result: fullHealExists });
        if (fullHealExists) operations.push({ op: 'bag_can_add_items', items: ['FULLHEAL'], result: canAdd });
        if (fullHealExists && canAdd) {
          const removed = attempt.remove_status_result !== false;
          operations.push({ op: 'remove_status_berries_transaction', quantity: 3, result: removed, rollback_on_partial_failure: true });
          if (removed) {
            const granted = attempt.grant_result !== false;
            operations.push({ op: 'grant_items', items: ['FULLHEAL'], result: granted });
            success = granted;
          }
        }
      }
    } else if (choice === 'rare') {
      const rareTotal = Number(attempt.rare_berry_total || 0);
      const total = Number(attempt.berry_total || 0);
      operations.push({ op: 'check_rare_berries', required: 1, available: rareTotal });
      if (rareTotal > 0) operations.push({ op: 'check_berry_count', recipe: 'rare', required: 3, available: total });
      if (rareTotal > 0 && total >= 3) {
        const reward = attempt.reward || null;
        operations.push({ op: 'resolve_juice_reward', recipe: 'rare', candidates: ['MAXPOTION','FULLRESTORE','HPUP','PROTEIN','IRON','CALCIUM','ZINC','CARBOS'], reward });
        if (reward) {
          const canAdd = attempt.can_add_result !== false;
          operations.push({ op: 'bag_can_add_items', items: [reward], result: canAdd });
          if (canAdd) {
            const rareId = attempt.rare_id || null;
            operations.push({ op: 'resolve_rare_berry', candidates: 'RARE_BERRIES_IN_BAG', item: rareId });
            if (rareId) {
              const removedRare = attempt.remove_rare_result !== false;
              operations.push({ op: 'remove_item', item: rareId, quantity: 1, result: removedRare });
              if (removedRare) {
                const consumed = attempt.consume_result !== false;
                operations.push({ op: 'consume_berries', quantity: 2, result: consumed });
                if (!consumed) operations.push({ op: 'rollback_add_item', item: rareId, quantity: 1 });
                if (consumed) {
                  const granted = attempt.grant_result !== false;
                  operations.push({ op: 'grant_items', items: [reward], result: granted });
                  success = granted;
                }
              }
            }
          }
        }
      }
    } else {
      operations.push({ op: 'unsupported_juice_choice', choice });
      return stopped(event, operations, 'invalid_choice');
    }
    operations.push({ op: 'juice_recipe_result', recipe: choice, success });
    if (success) data.uses += 1;
  }
}

function cloneEvent(event = {}) {
  return { ...event, normal_data: { ...(event.normal_data || {}) } };
}

export function resolveItemCollector(input = {}) {
  const event = cloneEvent(input.event || {});
  const operations = [];
  const choice = input.choice;
  const entries = Array.isArray(input.entries) ? input.entries.map((x) => ({
    id: x.id,
    qty: Number(x.qty || 0),
    grade: Number(x.grade || 0),
  })).filter((x) => x.id && x.qty > 0) : [];
  const pools = Array.isArray(input.grade_candidates) ? input.grade_candidates.map((g) => Array.isArray(g) ? [...g] : []) : [];

  const pending = (outcome) => ({ event, operations, result: false, outcome });
  const finish = (outcome) => {
    event.normal_resolved = true;
    operations.push({ op: 'finish_event' });
    return { event, operations, result: true, outcome };
  };

  operations.push({ op: 'present_choices', choices: ['ball', 'medicine', 'leave'] });
  if (!['ball', 'medicine', 'leave'].includes(choice)) return pending('cancelled');
  if (choice === 'leave') {
    operations.push({ op: 'leave_event' });
    return finish('left');
  }
  operations.push({ op: 'inventory_entries', category: choice, entries });
  if (!entries.length) return pending('no_exchangeable_items');

  const selected = input.selected_item;
  if (!selected) return pending('item_selection_cancelled');
  const source = entries.find((x) => x.id === selected);
  if (!source) return pending('selected_item_unavailable');

  const upgradeRoll = Number(input.upgrade_roll ?? 100);
  const upgraded = upgradeRoll < 25;
  const targetGrade = upgraded ? Math.min(source.grade + 1, Math.max(pools.length - 1, source.grade)) : source.grade;
  operations.push({ op: 'upgrade_roll', value: upgradeRoll, upgraded, source_grade: source.grade, target_grade: targetGrade });

  let candidates = (pools[targetGrade] || []).filter((id) => id && id !== selected);
  let candidateGrade = targetGrade;
  if (!candidates.length) {
    candidates = (pools[source.grade] || []).filter((id) => id && id !== selected);
    candidateGrade = source.grade;
    operations.push({ op: 'candidate_fallback', grade: source.grade });
  }
  if (!candidates.length) return pending('no_alternative_item');

  const rewardIndex = Math.max(0, Number(input.reward_index || 0)) % candidates.length;
  const reward = candidates[rewardIndex];
  operations.push({ op: 'select_reward', item: reward, grade: candidateGrade, index: rewardIndex });

  const canAdd = input.can_add_result !== false;
  operations.push({ op: 'can_add_item', item: reward, quantity: 1, result: canAdd });
  if (!canAdd) return pending('bag_full');

  const removed = input.remove_item_result !== false;
  operations.push({ op: 'remove_item', item: selected, quantity: 1, result: removed });
  if (!removed) return pending('remove_failed');

  const granted = input.grant_item_result !== false;
  operations.push({ op: 'grant_item', item: reward, quantity: 1, result: granted });
  if (!granted) {
    operations.push({ op: 'rollback_add_item', item: selected, quantity: 1 });
    return pending('grant_failed_rolled_back');
  }
  return finish('exchanged');
}

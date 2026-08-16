function result(event, operations, outcome, draws, moneyDelta) {
  return {
    event,
    operations,
    result: true,
    outcome,
    draws,
    money_delta: moneyDelta,
    bag_mutated: draws > 0,
  };
}

export function resolveMachineGacha(input = {}) {
  const event = { ...(input.event || {}) };
  event.normal_data = { ...((input.event || {}).normal_data || {}) };
  const data = event.normal_data;
  const stock = Array.isArray(data.machine_stock) ? [...data.machine_stock] : [];
  let index = Number(data.machine_index || 0);
  let money = Number(input.money || 0);
  const choices = Array.isArray(input.choices) ? input.choices : [];
  const exists = input.item_exists || {};
  const canAdd = Array.isArray(input.can_add_results) ? input.can_add_results : [];
  const add = Array.isArray(input.add_results) ? input.add_results : [];
  const operations = [];
  let choiceIndex = 0;
  let bagProbeIndex = 0;
  let draws = 0;
  let moneyDelta = 0;
  let outcome = 'left_without_use';

  while (true) {
    if (index >= stock.length) {
      operations.push({ op: 'machine_empty' });
      outcome = draws > 0 ? 'exhausted_after_use' : 'empty';
      break;
    }
    operations.push({ op: 'present_machine_choice', price: 1500, item_hidden: true });
    const choice = choices[choiceIndex++] ?? 'leave';
    if (choice !== 'buy') break;
    if (money < 1500) {
      operations.push({ op: 'insufficient_money', required: 1500, available: money });
      outcome = draws > 0 ? 'insufficient_after_use' : 'insufficient_money';
      break;
    }
    const item = stock[index];
    const itemExists = item != null && exists[item] !== false;
    operations.push({ op: 'check_item_exists', item, result: itemExists });
    if (!itemExists) {
      index += 1;
      continue;
    }
    const canAddResult = canAdd[bagProbeIndex] !== false;
    operations.push({ op: 'bag_can_add', item, quantity: 1, result: canAddResult });
    if (!canAddResult) {
      outcome = draws > 0 ? 'bag_full_after_use' : 'bag_full';
      break;
    }
    const addResult = add[bagProbeIndex] !== false;
    bagProbeIndex += 1;
    operations.push({ op: 'bag_add', item, quantity: 1, result: addResult });
    if (!addResult) {
      outcome = draws > 0 ? 'bag_add_failed_after_use' : 'bag_add_failed';
      break;
    }
    operations.push({ op: 'spend_money', amount: 1500, result: true });
    operations.push({ op: 'machine_item_reward', item, quantity: 1 });
    operations.push({ op: 'metric_increment', key: 'machine_gacha_uses', amount: 1 });
    operations.push({ op: 'metric_nested_increment', key: 'machine_items_received', subkey: item, amount: 1 });
    money -= 1500;
    moneyDelta -= 1500;
    index += 1;
    draws += 1;
    data.machine_index = index;
    outcome = 'used';
  }

  data.machine_index = index;
  event.normal_resolved = true;
  operations.push({ op: 'leave_event', message: draws > 0 ? '端末の利用を終えた。' : '端末を使わず立ち去った。' });
  return result(event, operations, outcome, draws, moneyDelta);
}

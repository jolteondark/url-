function cloneEvent(event = {}) { return { ...event, normal_data: { ...(event.normal_data || {}) } }; }
function unresolved(event, operations, outcome, extra = {}) { return { event, operations, result: false, outcome, ...extra }; }
function finish(event, operations, outcome, extra = {}) { event.normal_resolved = true; operations.push({ op: 'finish_event' }); return { event, operations, result: true, outcome, ...extra }; }

export function resolveFakeNurse(input = {}) {
  const event = cloneEvent(input.event || {});
  const data = event.normal_data;
  const operations = [];
  const normalPrice = 500 + Number(input.scaling_value || 0) * 100;
  const warned = data.fake === true && input.has_dark_or_psychic === true;
  if (warned) operations.push({ op: 'warn_fake_nurse', types: ['DARK', 'PSYCHIC'] });
  operations.push({ op: 'present_choices', price: normalPrice, choices: ['pay', 'check_id', 'leave'] });
  const choice = input.choice;
  if (!['pay', 'check_id', 'leave'].includes(choice)) return unresolved(event, operations, 'cancelled', { normal_price: normalPrice, warned });
  if (choice === 'leave') { operations.push({ op: 'leave_event' }); return finish(event, operations, 'left', { normal_price: normalPrice, warned }); }

  if (choice === 'pay') {
    const spent = input.spend_money_result !== false;
    operations.push({ op: 'spend_money', amount: normalPrice, result: spent });
    if (!spent) return unresolved(event, operations, 'payment_failed', { normal_price: normalPrice, warned });
    if (data.fake === true) {
      operations.push({ op: 'trap_reveal' });
      operations.push({ op: 'inflict_status', party_index: 0, status: input.random_status ?? null, seed: event.normal_seed ?? null });
      return finish(event, operations, 'fake_paid_trap', { normal_price: normalPrice, warned });
    }
    operations.push({ op: 'full_heal_party' });
    return finish(event, operations, 'real_paid_heal', { normal_price: normalPrice, warned });
  }

  if (data.fake === true) {
    operations.push({ op: 'trap_reveal' });
    const idRoll = Number(data.id_roll || 0);
    operations.push({ op: 'id_roll', value: idRoll });
    if (idRoll < 50) {
      operations.push({ op: 'grant_random', tier: 'small', count: 1, result: input.grant_random_result !== false });
      return finish(event, operations, 'fake_id_fled_reward', { normal_price: normalPrice, warned });
    }
    const battleResult = input.battle_result ?? null;
    operations.push({ op: 'start_trainer_battle_request', modifier: 0, seed: event.normal_seed ?? null, result: battleResult });
    operations.push({ op: 'battle_success_check', result: input.battle_success === true });
    return finish(event, operations, input.battle_success === true ? 'fake_id_battle_won' : 'fake_id_battle_finished', { normal_price: normalPrice, warned });
  }

  const halfPrice = Math.max(Math.floor(normalPrice / 2), 1);
  operations.push({ op: 'offer_half_price_heal', amount: halfPrice, choices: ['heal', 'leave'] });
  if (input.id_check_choice === 'heal') {
    const spent = input.half_spend_money_result !== false;
    operations.push({ op: 'spend_money', amount: halfPrice, result: spent });
    if (spent) operations.push({ op: 'heal_party_percent', percent: 50, revive: false });
  }
  return finish(event, operations, 'real_id_checked', { normal_price: normalPrice, half_price: halfPrice, warned });
}

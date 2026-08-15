import { resolveVillageBountyDepart } from './mapless-village-bounty-depart.js';
import { setMoney } from './bag-economy-mart-flow.js';

export function resolveVillageBountyMoneyIntegration(input = {}) {
  const moneyBefore = Number(input.money ?? 0);
  const maxMoney = Number(input.maxMoney ?? 9999999);
  const depart = resolveVillageBountyDepart(input);
  const rewardRequest = depart.operations.find((op) => op.op === 'request_add_money');
  const moneyOperations = [];
  let money = moneyBefore;

  if (rewardRequest) {
    const amount = Number(rewardRequest.amount);
    money = setMoney(money + amount, maxMoney);
    moneyOperations.push(
      { op: 'add_money', amount, result: true },
      { op: 'set_money', before: moneyBefore, after: money },
    );
  }

  return {
    depart,
    state: depart.state,
    result: depart.result,
    money,
    moneyDelta: money - moneyBefore,
    moneyOperations,
    return_target: 'village',
  };
}

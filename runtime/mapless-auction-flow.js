export function resolveAuctionProductStep(product = {}, input = {}) {
  const p = { ...product, npc_limits: [...(product.npc_limits ?? [])], npc_active: [...(product.npc_active ?? [])] };
  const operations = [];
  if (input.choice == null) {
    return { awaiting_choice: true, won: false, product: p, operations, money_spent: 0, granted_items: [] };
  }

  const price = Number(p.price ?? 0);
  const choice = Number(input.choice);
  operations.push({ op: "choice", price, result: choice });
  if (choice < 0 || choice === 2) {
    return { awaiting_choice: false, won: false, product: p, operations, money_spent: 0, granted_items: [] };
  }

  const rate = choice === 0 ? 110 : 125;
  const bid = Math.max(Math.ceil(price * rate / 100), price + 1);
  if (Number(input.money ?? 0) < bid) {
    operations.push({ op: "message", text: "所持金以上には入札できない。" });
    return { awaiting_choice: true, won: false, product: p, operations, money_spent: 0, granted_items: [] };
  }

  p.price = bid;
  operations.push({ op: "auction_bid", price: bid });
  let active = false;
  for (let i = 0; i < p.npc_limits.length; i++) {
    if (!p.npc_active[i]) continue;
    const limit = Number(p.npc_limits[i] ?? 0);
    if (Number(p.price) < limit) {
      const increment = Math.max(Math.trunc(Number(p.price) / 10), 100);
      p.price = Math.min(Number(p.price) + increment, limit);
      active = true;
      operations.push({ op: "npc_bid", index: i, price: Number(p.price) });
    } else {
      p.npc_active[i] = false;
    }
  }
  if (active) {
    return { awaiting_choice: true, won: false, product: p, operations, money_spent: 0, granted_items: [] };
  }

  const finalPrice = Number(p.price);
  const spend = input.spend_money_result !== false;
  operations.push({ op: "spend_money", amount: finalPrice, result: spend });
  if (!spend) {
    return { awaiting_choice: false, won: false, product: p, operations, money_spent: 0, granted_items: [] };
  }
  if (p.fake) {
    operations.push({ op: "trap_reveal" });
    return { awaiting_choice: false, won: true, product: p, operations, money_spent: finalPrice, granted_items: [] };
  }

  const canAdd = input.can_add_items_result !== false;
  operations.push({ op: "can_add_items", items: { [p.item]: 1 }, result: canAdd });
  if (!canAdd) {
    operations.push({ op: "refund_money", amount: finalPrice });
    return { awaiting_choice: false, won: false, product: p, operations, money_spent: 0, granted_items: [] };
  }
  operations.push({ op: "grant_items", items: [p.item], result: input.grant_items_result !== false });
  return { awaiting_choice: false, won: true, product: p, operations, money_spent: finalPrice, granted_items: [p.item] };
}

export function resolveAuctionProduct(product = {}, input = {}) {
  let p = { ...product, npc_limits: [...(product.npc_limits ?? [])], npc_active: [...(product.npc_active ?? [])] };
  const operations = [];
  const choices = [...(input.choices ?? [])];
  let choiceIndex = 0;
  while (true) {
    const choice = choiceIndex < choices.length ? Number(choices[choiceIndex++]) : 2;
    const result = resolveAuctionProductStep(p, { ...input, choice });
    p = result.product;
    operations.push(...result.operations);
    if (result.awaiting_choice) continue;
    return { won: result.won, product: p, operations, money_spent: result.money_spent, granted_items: result.granted_items };
  }
}

export function resolveAuctionEvent(input = {}) {
  const data = structuredClone(input.data ?? { products: [], won: false }); const operations = []; const ghost = !!input.ghost; let moneySpent = 0; const grantedItems = []; const productInputs = input.product_inputs ?? [];
  for (let i = 0; i < (data.products ?? []).length; i++) {
    const product = data.products[i]; if (product.finished) continue; if (data.won) break;
    operations.push({ op: "product_intro", index: i + 1, ghost, item: ghost ? product.item : null, fake: ghost ? !!product.fake : null, fair: ghost ? Number(product.fair ?? 0) : null, price: ghost ? null : Number(product.price ?? 0) });
    const result = resolveAuctionProduct(product, { money: Number(input.money ?? 0) - moneySpent, ...(productInputs[i] ?? {}) }); data.products[i] = result.product; operations.push({ op: "auction_product", index: i, result }); if (result.won) data.won = true; data.products[i].finished = true; moneySpent += result.money_spent; grantedItems.push(...result.granted_items);
  }
  operations.push({ op: "message", text: data.won ? "落札品を受け取り、競りを終えた。" : "オークションを後にした。" }); const finished = input.finish_event_result !== false; operations.push({ op: "finish_event", result: finished }); return { operations, data, result: finished, money_spent: moneySpent, granted_items: grantedItems };
}

export function resolveVillageFixedShopActionSlice(input = {}) {
  const shopIds = new Set(["normal_shop", "ball_shop", "held_shop", "tm_shop", "tr_shop", "evolution_shop", "mint_shop"]);
  const id = String(input.facility_id || "");
  const operations = [{ op: "mark_facility_view", facility_id: id }];
  if (!shopIds.has(id)) return { operations: [...operations, { op: "delegate_facility", facility_id: id }], success: false, purchased: false, sold: false, action_consumed: false, use_count: 0 };
  const stock = Array.isArray(input.valid_stock) ? [...input.valid_stock] : [];
  if (!stock.length) return { operations: [...operations, { op: "message", key: "empty_stock" }], success: false, purchased: false, sold: false, action_consumed: false, use_count: 0 };
  if (input.facility_used_up) return { operations: [...operations, { op: "show_stock", stock }, { op: "message", key: "already_used" }], success: false, purchased: false, sold: false, action_consumed: false, use_count: 0 };
  if (!input.action_available) return { operations: [...operations, { op: "show_stock", stock }, { op: "message", key: "no_actions" }], success: false, purchased: false, sold: false, action_consumed: false, use_count: 0 };

  operations.push({ op: "snapshot_bag", scope: "stock", stock }, { op: "snapshot_bag", scope: "all" }, { op: "snapshot_money" }, { op: "request_open_fixed_shop", facility_id: id, stock });
  const beforeStock = input.before_stock || {};
  const afterStock = input.after_stock || {};
  const purchased = stock.some((item) => Number(afterStock[item] || 0) > Number(beforeStock[item] || 0));
  const beforeAll = input.before_all || {};
  const afterAll = input.after_all || {};
  const sold = Number(input.after_money || 0) > Number(input.before_money || 0) && Object.entries(beforeAll).some(([item, quantity]) => Number(afterAll[item] || 0) < Number(quantity || 0));

  if (purchased) {
    for (const item of stock) {
      const gained = Number(afterStock[item] || 0) - Number(beforeStock[item] || 0);
      if (gained > 0 && Boolean((input.machine_items || {})[item])) operations.push({ op: "request_metric_increment", metric: "machine_items_bought", item_id: item, amount: gained });
    }
  }
  const success = purchased || sold;
  if (!success) return { operations, success: false, purchased, sold, action_consumed: false, use_count: 0 };
  operations.push({ op: "request_consume_village_action", count: 1 });
  if (input.consume_action_success === false) {
    operations.push({ op: "message", key: "action_update_failed" });
    return { operations, success: false, purchased, sold, action_consumed: false, use_count: 0 };
  }
  operations.push({ op: "mark_facility_use", facility_id: id, use_count: 1 });
  if (input.save_available) operations.push({ op: "request_save" });
  return { operations, success: true, purchased, sold, action_consumed: true, use_count: 1 };
}
